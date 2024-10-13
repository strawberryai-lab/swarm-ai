# Swarm-ai

Swarm-ai is a TypeScript port of the [Python Swarm library](https://github.com/openai/swarm) developed by OpenAI. This project aims to bring the powerful capabilities of Swarm to the JavaScript ecosystem, allowing developers to leverage the same concepts and functionalities in TypeScript and Node.js environments.


Swarm-ai is a TypeScript library for building conversational AI agents with tool-calling capabilities. It provides a flexible framework for creating and managing AI agents that can engage in conversations and utilize various functions or tools.

## Features

- Create AI agents with custom instructions and functions
- Support for context variables in agent instructions
- Function calling capabilities for agents
- Streaming support for real-time interactions
- Easy integration with OpenAI's GPT models

## Getting Started

```bash
npm install swarm-ai
```

## Example usage

```typescript
import { Swarm } from 'swarm-ai';

const client = new Swarm();

const agent = {
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
```

## Examples

You can find examples of Swarm-ai usage in the `examples` directory.