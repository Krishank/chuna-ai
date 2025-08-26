import { executeHttp } from '../http/executor.js';
import type { ChunaConfig, ToolConfig, PreMiddleware, PostMiddleware, MiddlewareContext, HttpRequestSpec } from '../config/loader.js';
import * as middleware from '../middleware/index.js';

type StartOptions = { config: ChunaConfig };

type McpTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<{ content: unknown }>;
};

function getMiddlewareFunction(name: string): PreMiddleware | PostMiddleware {
  const fn = (middleware as any)[name];
  if (!fn || typeof fn !== 'function') {
    throw new Error(`Middleware function "${name}" not found. Available: ${Object.keys(middleware).join(', ')}`);
  }
  return fn;
}

function buildToolFromConfig(tool: ToolConfig): McpTool {
  return {
    name: tool.name,
    description: tool.description,
    handler: async (args) => {
      if (!/^https?:\/\//i.test(tool.url)) {
        throw new Error(`Tool ${tool.name} requires an absolute URL (got: ${tool.url})`);
      }

      const context: MiddlewareContext = {
        toolName: tool.name,
        args,
      };

      // Start with the base HTTP spec
      let httpSpec: HttpRequestSpec = {
        method: tool.method,
        url: tool.url,
        headers: tool.headers,
        query: tool.query,
        body: tool.body,
      };

      // Apply pre-middleware
      if (tool.preMiddleware) {
        for (const middlewareName of tool.preMiddleware) {
          const preFn = getMiddlewareFunction(middlewareName) as PreMiddleware;
          httpSpec = await preFn(httpSpec, context);
        }
      }

      // Execute HTTP request
      const result = await executeHttp(httpSpec);

      // Apply post-middleware
      let finalResult = result;
      if (tool.postMiddleware) {
        for (const middlewareName of tool.postMiddleware) {
          const postFn = getMiddlewareFunction(middlewareName) as PostMiddleware;
          finalResult = await postFn(finalResult, context);
        }
      }

      return { content: finalResult };
    },
  };
}

export async function startMcpServer(options: StartOptions): Promise<void> {
  const tools = options.config.tools.map((t) => buildToolFromConfig(t));

  // Minimal MCP stdio protocol shim: register and handle tool calls.
  // For v1, support a tiny subset sufficient for Cursor/Claude MCP clients.
  process.stdin.setEncoding('utf8');
  let buffer = '';

  async function handleMessage(message: any): Promise<void> {
    if (message?.method === 'tools/list') {
      const toolList = tools.map((t) => ({ name: t.name, description: t.description }));
      write({ jsonrpc: '2.0', id: message.id, result: { tools: toolList } });
      return;
    }
    if (message?.method === 'tools/call') {
      const params = message.params as { name: string; arguments?: Record<string, unknown> };
      const tool = tools.find((t) => t.name === params.name);
      if (!tool) {
        write({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Tool not found: ${params.name}` } });
        return;
      }
      try {
        const result = await tool.handler(params.arguments ?? {});
        write({ jsonrpc: '2.0', id: message.id, result: { content: result.content } });
      } catch (error: any) {
        write({ jsonrpc: '2.0', id: message.id, error: { code: -32000, message: String(error?.message ?? error) } });
      }
      return;
    }
    // Basic reply for other methods
    write({ jsonrpc: '2.0', id: message.id, result: null });
  }

  function write(obj: any): void {
    const payload = JSON.stringify(obj);
    const header = `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n`;
    process.stdout.write(header + payload);
  }

  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    while (true) {
      const sepIndex = buffer.indexOf('\r\n\r\n');
      if (sepIndex === -1) break;
      const headerBlock = buffer.slice(0, sepIndex);
      const contentLengthMatch = /Content-Length:\s*(\d+)/i.exec(headerBlock);
      if (!contentLengthMatch) {
        buffer = buffer.slice(sepIndex + 4);
        continue;
      }
      const contentLength = Number(contentLengthMatch[1]);
      const start = sepIndex + 4;
      const end = start + contentLength;
      if (buffer.length < end) break;
      const body = buffer.slice(start, end);
      buffer = buffer.slice(end);
      try {
        const msg = JSON.parse(body);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        handleMessage(msg);
      } catch {
        // ignore malformed messages
      }
    }
  });
}