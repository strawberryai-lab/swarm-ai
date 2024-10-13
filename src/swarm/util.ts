import { inspect } from 'util';

export function debugPrint(debug: boolean, ...args: any[]): void {
  if (!debug) return;
  const timestamp = new Date().toISOString();
  const message = args
    .map((arg) => (typeof arg === 'object' ? inspect(arg, { depth: null }) : String(arg)))
    .join(' ');
  console.log(`\x1b[97m[\x1b[90m${timestamp}\x1b[97m]\x1b[90m ${message}\x1b[0m`);
}

export function mergeFields(target: any, source: any): void {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') {
      target[key] += value;
    } else if (value !== null && typeof value === 'object') {
      mergeFields(target[key], value);
    }
  }
}

export function mergeChunk(finalResponse: any, delta: any): void {
  delete delta.role;
  mergeFields(finalResponse, delta);

  const toolCalls = delta.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    const index = toolCalls[0].index;
    delete toolCalls[0].index;
    mergeFields(finalResponse.tool_calls[index], toolCalls[0]);
  }
}

export function functionToJson(func: Function): any {
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    object: 'object',
    undefined: 'null',
  };

  const parameters: Record<string, any> = {};
  const required: string[] = [];

  // This is a simplified version, as TypeScript doesn't provide runtime type information
  // You might need to use decorators or other metadata approaches for more accurate type mapping
  for (const param of func
    .toString()
    .match(/\(([^)]*)\)/)?.[1]
    .split(',') || []) {
    const [name, type] = param.trim().split(':');
    if (name) {
      parameters[name] = { type: typeMap[type?.trim()] || 'string' };
      required.push(name);
    }
  }

  return {
    type: 'function',
    function: {
      name: func.name,
      description:
        func
          .toString()
          .match(/\/\*\*([\s\S]*?)\*\//)?.[1]
          ?.trim() || '',
      parameters: {
        type: 'object',
        properties: parameters,
        required,
      },
    },
  };
}
