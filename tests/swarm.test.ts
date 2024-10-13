import { Swarm } from '../src/swarm/core';
import { Agent, Response } from '../src/swarm/types';

describe('Swarm', () => {
  it('should run a simple conversation', async () => {
    const swarm = new Swarm();

    const testAgent: Agent = {
      name: 'TestAgent',
      model: 'gpt-4o',
      instructions: 'You are a helpful assistant.',
      functions: [],
      tool_choice: null,
      parallel_tool_calls: true,
    };

    const messages = [{ role: 'user', content: 'Hello, how are you?' }];

    const response = (await swarm.run(testAgent, messages)) as Response;

    expect(response.messages).toHaveLength(1);
    expect(response.messages[0].role).toBe('assistant');
    expect(response.messages[0].content).toBeTruthy();
    expect(response.agent).toEqual(testAgent);
    expect(response.context_variables).toEqual({});
  });
});
