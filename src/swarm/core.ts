import { OpenAI } from 'openai';
import { defaultsDeep } from 'lodash';
import { Agent, AgentFunction, Response, Result, ChatCompletionMessageToolCall } from './types';
import { functionToJson, debugPrint, mergeChunk } from './util';

const __CTX_VARS_NAME__ = 'context_variables';

export class Swarm {
  private client: OpenAI;

  constructor(client?: OpenAI) {
    this.client = client || new OpenAI();
  }

  private async getChatCompletion(
    agent: Agent,
    history: any[],
    context_variables: Record<string, any>,
    model_override: string | null,
    stream: boolean,
    debug: boolean
  ): Promise<any> {
    const ctx_vars = defaultsDeep({}, context_variables);
    let instructions: string;
    if (typeof agent.instructions === 'function') {
      if (agent.instructions.length > 0) {
        instructions = agent.instructions(ctx_vars);
      } else {
        instructions = (agent.instructions as () => string)();
      }
    } else {
      instructions = agent.instructions;
    }
    const messages = [{ role: 'system', content: instructions }, ...history];
    debugPrint(debug, 'Getting chat completion for...:', messages);

    const tools = agent.functions.map((f) => functionToJson(f));
    // hide context_variables from model
    for (const tool of tools) {
      const params = tool.function.parameters;
      delete params.properties[__CTX_VARS_NAME__];
      if (params.required.includes(__CTX_VARS_NAME__)) {
        params.required = params.required.filter((r: string) => r !== __CTX_VARS_NAME__);
      }
    }

    const createParams: any = {
      model: model_override || agent.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: agent.tool_choice,
      stream,
    };

    if (tools.length > 0) {
      createParams.parallel_tool_calls = agent.parallel_tool_calls;
    }

    return this.client.chat.completions.create(createParams);
  }

  private handleFunctionResult(result: any, debug: boolean): Result {
    if (result instanceof Result) {
      return result;
    }

    if (typeof result === 'object' && result !== null &&
        'name' in result &&
        'model' in result &&
        'instructions' in result &&
        'functions' in result
    ) {
      return new Result(JSON.stringify({ assistant: result.name }), result);
    }

    try {
      return new Result(String(result));
    } catch (e) {
      const errorMessage = `Failed to cast response to string: ${result}. Make sure agent functions return a string or Result object. Error: ${e}`;
      debugPrint(debug, errorMessage);
      throw new TypeError(errorMessage);
    }
  }

  private async handleToolCalls(
    tool_calls: ChatCompletionMessageToolCall[],
    functions: AgentFunction[],
    context_variables: Record<string, any>,
    debug: boolean
  ): Promise<Response> {
    const functionMap = Object.fromEntries(functions.map((f) => [f.name, f]));
    const partialResponse: Response = {
      messages: [],
      agent: null,
      context_variables: {},
    };

    for (const tool_call of tool_calls) {
      const name = tool_call.function.name;
      if (!(name in functionMap)) {
        debugPrint(debug, `Tool ${name} not found in function map.`);
        partialResponse.messages.push({
          role: 'tool',
          tool_call_id: tool_call.id,
          tool_name: name,
          content: `Error: Tool ${name} not found.`,
        });
        continue;
      }

      const args = JSON.parse(tool_call.function.arguments);
      debugPrint(debug, `Processing tool call: ${name} with arguments ${args}`);

      const func = functionMap[name];
      if (func.toString().includes(__CTX_VARS_NAME__)) {
        args[__CTX_VARS_NAME__] = context_variables;
      }
      const rawResult = await func(args);

      const result: Result = this.handleFunctionResult(rawResult, debug);
      partialResponse.messages.push({
        role: 'tool',
        tool_call_id: tool_call.id,
        tool_name: name,
        content: result.value,
      });
      partialResponse.context_variables = {
        ...partialResponse.context_variables,
        ...result.context_variables,
      };
      if (result.agent) {
        partialResponse.agent = result.agent;
      }
    }

    return partialResponse;
  }

  async run(
    agent: Agent,
    messages: any[],
    context_variables: Record<string, any> = {},
    model_override: string | null = null,
    stream: boolean = false,
    debug: boolean = false,
    max_turns: number = Infinity,
    execute_tools: boolean = true
  ): Promise<Response | AsyncGenerator<any, void, unknown>> {
    if (stream) {
      return this.runAndStream(
        agent,
        messages,
        context_variables,
        model_override,
        debug,
        max_turns,
        execute_tools
      );
    }

    let activeAgent = agent;
    const ctx_vars = { ...context_variables };
    const history = [...messages];
    const init_len = messages.length;

    while (history.length - init_len < max_turns && activeAgent) {
      const completion = await this.getChatCompletion(
        activeAgent,
        history,
        ctx_vars,
        model_override,
        stream,
        debug
      );

      const message = completion.choices[0].message;
      debugPrint(debug, 'Received completion:', message);
      message.sender = activeAgent.name;
      history.push(JSON.parse(JSON.stringify(message)));

      if (!message.tool_calls || !execute_tools) {
        debugPrint(debug, 'Ending turn.');
        break;
      }

      const partialResponse = await this.handleToolCalls(
        message.tool_calls,
        activeAgent.functions,
        ctx_vars,
        debug
      );
      history.push(...partialResponse.messages);
      Object.assign(ctx_vars, partialResponse.context_variables);
      if (partialResponse.agent) {
        activeAgent = partialResponse.agent;
      }
    }

    return {
      messages: history.slice(init_len),
      agent: activeAgent,
      context_variables: ctx_vars,
    };
  }

  private async *runAndStream(
    agent: Agent,
    messages: any[],
    context_variables: Record<string, any> = {},
    model_override: string | null = null,
    debug: boolean = false,
    max_turns: number = Infinity,
    execute_tools: boolean = true
  ): AsyncGenerator<any, void, unknown> {
    let activeAgent = agent;
    const ctx_vars = { ...context_variables };
    const history = [...messages];
    const init_len = messages.length;

    while (history.length - init_len < max_turns) {
      const message: any = {
        content: '',
        sender: agent.name,
        role: 'assistant',
        function_call: null,
        tool_calls: {},
      };

      const completion = await this.getChatCompletion(
        activeAgent,
        history,
        ctx_vars,
        model_override,
        true,
        debug
      );

      yield { delim: 'start' };
      for await (const chunk of completion) {
        const delta = JSON.parse(JSON.stringify(chunk.choices[0].delta));
        if (delta.role === 'assistant') {
          delta.sender = activeAgent.name;
        }
        yield delta;
        delete delta.role;
        delete delta.sender;
        mergeChunk(message, delta);
      }
      yield { delim: 'end' };

      message.tool_calls = Object.values(message.tool_calls);
      if (message.tool_calls.length === 0) {
        message.tool_calls = null;
      }
      debugPrint(debug, 'Received completion:', message);
      history.push(message);

      if (!message.tool_calls || !execute_tools) {
        debugPrint(debug, 'Ending turn.');
        break;
      }

      const partialResponse = await this.handleToolCalls(
        message.tool_calls,
        activeAgent.functions,
        ctx_vars,
        debug
      );
      history.push(...partialResponse.messages);
      Object.assign(ctx_vars, partialResponse.context_variables);
      if (partialResponse.agent) {
        activeAgent = partialResponse.agent;
      }
    }

    yield {
      response: {
        messages: history.slice(init_len),
        agent: activeAgent,
        context_variables: ctx_vars,
      },
    };
  }
}
