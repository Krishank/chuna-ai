export function greet(name: string): string {
  return `Hello, ${name}!`;
}

export default {
  greet,
};

export type { ChunaConfig, ToolConfig, PreMiddleware, PostMiddleware, MiddlewareContext, HttpRequestSpec } from './config/loader.js';
export { loadConfigFromPath } from './config/loader.js';
export { startMcpServer } from './mcp/server.js';
export * from './middleware/index.js';

