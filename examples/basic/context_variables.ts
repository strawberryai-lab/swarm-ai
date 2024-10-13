import { Swarm } from '../../src/swarm/core';
import { Agent, AgentFunction } from '../../src/swarm/types';

const client = new Swarm();

const instructionsWithContext = (context_variables: Record<string, any>): string => {
  const name = context_variables.name || 'User';
  return `You are a helpful agent. Greet the user by name (${name}).`;
};

const instructionsWithoutContext = (): string => {
  return `You are a helpful agent. Greet the user politely.`;
};

const printAccountDetails: AgentFunction = async (args: Record<string, any>) => {
  const context_variables = args.context_variables || {};
  const userId = context_variables.user_id || null;
  const name = context_variables.name || null;
  console.log(`Account Details: ${name} ${userId}`);
  return 'Success';
};

const agentWithContext: Agent = {
  name: 'AgentWithContext',
  model: 'gpt-4o',
  instructions: instructionsWithContext,
  functions: [printAccountDetails],
  tool_choice: null,
  parallel_tool_calls: true,
};

const agentWithoutContext: Agent = {
  name: 'AgentWithoutContext',
  model: 'gpt-4o',
  instructions: instructionsWithoutContext,
  functions: [printAccountDetails],
  tool_choice: null,
  parallel_tool_calls: true,
};

const contextVariables = { name: 'James', user_id: 123 };

(async () => {
  // Test agent with context
  let response = await client.run(agentWithContext, [{ role: 'user', content: 'Hi!' }], contextVariables);
  if ('messages' in response) {
    console.log('Agent with context:', response.messages[response.messages.length - 1].content);
  }

  // Test agent without context
  response = await client.run(agentWithoutContext, [{ role: 'user', content: 'Hello!' }], contextVariables);
  if ('messages' in response) {
    console.log('Agent without context:', response.messages[response.messages.length - 1].content);
  }

  // Test function calling
  response = await client.run(
    agentWithContext,
    [{ role: 'user', content: 'Print my account details!' }],
    contextVariables
  );
  if ('messages' in response) {
    console.log('Function call result:', response.messages[response.messages.length - 1].content);
  }
})();
