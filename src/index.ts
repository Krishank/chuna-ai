export function greet(name: string): string {
  return `Hello, ${name}!`;
}

export default {
  greet,
};

export type { ChunaConfig, ToolConfig } from './config/loader.js';
export { loadConfigFromPath } from './config/loader.js';
export { startMcpServer } from './mcp/server.js';

