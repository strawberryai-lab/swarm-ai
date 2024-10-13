import { Swarm } from '../../src/swarm/core';
import { Agent, Response } from '../../src/swarm/types';
import * as readline from 'readline';

const client = new Swarm();

const myAgent: Agent = {
  name: 'Agent',
  model: 'gpt-4o',
  instructions: 'You are a helpful agent.',
  functions: [],
  tool_choice: null,
  parallel_tool_calls: true,
};

function prettyPrintMessages(messages: any[]): void {
  for (const message of messages) {
    if (message.content === null) continue;
    console.log(`${message.sender || message.role}: ${message.content}`);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function runLoop() {
  let messages: any[] = [];
  let agent = myAgent;

  while (true) {
    const userInput = await new Promise<string>((resolve) => rl.question('> ', resolve));
    messages.push({ role: 'user', content: userInput });

    const response = (await client.run(agent, messages)) as Response;
    messages = response.messages;
    agent = response.agent || agent;
    prettyPrintMessages(messages);
  }
}

runLoop().catch(console.error);
