import { Swarm } from '../../src/swarm/core';
import { Agent } from '../../src/swarm/types';

const client = new Swarm();

const agent: Agent = {
  name: 'Agent',
  model: 'gpt-4o',
  instructions: 'You are a helpful agent.',
  functions: [],
  tool_choice: null,
  parallel_tool_calls: true,
};

const messages = [{ role: 'user', content: 'Hi!' }];

(async () => {
  const response = await client.run(agent, messages);
  if ('messages' in response) {
    console.log(response.messages[response.messages.length - 1].content);
  }
})();
