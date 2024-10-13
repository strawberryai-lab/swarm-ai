import { ChatCompletionMessageToolCall } from 'openai/resources';

export type AgentFunction = (
  args: Record<string, any>
) => Promise<string | Agent | Record<string, any>>;

export interface Agent {
  name: string;
  model: string;
  instructions: string | (() => string) | ((context_variables: Record<string, any>) => string);
  functions: AgentFunction[];
  tool_choice: string | null;
  parallel_tool_calls: boolean;
}

export interface Response {
  messages: any[];
  agent: Agent | null;
  context_variables: Record<string, any>;
}

export class Result {
  constructor(
    public value: string,
    public agent: Agent | null = null,
    public context_variables: Record<string, any> = {}
  ) {}
}

export { ChatCompletionMessageToolCall };
