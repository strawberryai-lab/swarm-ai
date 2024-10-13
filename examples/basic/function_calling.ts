import { Swarm } from '../../src/swarm/core';
import { Agent, AgentFunction } from '../../src/swarm/types';

const client = new Swarm();

const getWeather: AgentFunction = async (args: Record<string, any>): Promise<string> => {
  return "{'temp':67, 'unit':'F'}";
};

const agent: Agent = {
  name: 'Agent',
  model: 'gpt-4o',
  instructions: 'You are a helpful agent.',
  functions: [getWeather],
  tool_choice: null,
  parallel_tool_calls: true,
};

const messages = [{ role: 'user', content: "What's the weather in NYC?" }];

(async () => {
  const response = await client.run(agent, messages);
  if ('messages' in response) {
    console.log(response.messages[response.messages.length - 1].content);
  }
})();
