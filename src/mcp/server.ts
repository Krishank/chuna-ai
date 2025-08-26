import { executeHttp } from '../http/executor.js';
import type { ChunaConfig, ToolConfig } from '../config/loader.js';

type StartOptions = { config: ChunaConfig };

type McpTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<{ content: unknown }>;
};

function buildToolFromConfig(tool: ToolConfig, baseUrl?: string): McpTool {
  return {
    name: tool.name,
    description: tool.description,
    handler: async (args) => {
      const url = tool.url.startsWith('http') ? tool.url : (baseUrl ? new URL(tool.url, baseUrl).toString() : tool.url);
      const result = await executeHttp({
        method: tool.method,
        url,
        headers: tool.headers,
        query: tool.query,
        body: tool.body,
      });
      return { content: { status: result.status, headers: result.headers, body: result.body } };
    },
  };
}

export async function startMcpServer(options: StartOptions): Promise<void> {
  const tools = options.config.tools.map((t) => buildToolFromConfig(t, options.config.baseUrl));

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


