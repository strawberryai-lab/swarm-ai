import { Swarm } from '../../src/swarm/core';
import { Agent } from '../../src/swarm/types';

const client = new Swarm();

const englishAgent: Agent = {
  name: 'English Agent',
  model: 'gpt-4o',
  instructions: 'You only speak English.',
  functions: [],
  tool_choice: null,
  parallel_tool_calls: true,
};

const spanishAgent: Agent = {
  name: 'Spanish Agent',
  model: 'gpt-4o',
  instructions: 'You only speak Spanish.',
  functions: [],
  tool_choice: null,
  parallel_tool_calls: true,
};

const transferToSpanishAgent = async (): Promise<Agent> => {
  return spanishAgent;
};

englishAgent.functions.push(transferToSpanishAgent);

const messages = [{ role: 'user', content: 'Hola. ¿Como estás?' }];

(async () => {
  const response = await client.run(englishAgent, messages);
  if ('messages' in response) {
    console.log(response.messages[response.messages.length - 1].content);
  }
})();
