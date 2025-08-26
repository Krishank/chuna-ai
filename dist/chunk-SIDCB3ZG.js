// src/http/executor.ts
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import { URL as URL2 } from "url";
async function executeHttp(spec) {
  const base = new URL2(spec.url);
  if (spec.query) {
    for (const [k, v] of Object.entries(spec.query)) base.searchParams.set(k, String(v));
  }
  const isHttps = base.protocol === "https:";
  const reqFn = isHttps ? httpsRequest : httpRequest;
  const payload = spec.body === void 0 || spec.body === null ? void 0 : typeof spec.body === "string" || Buffer.isBuffer(spec.body) ? spec.body : Buffer.from(JSON.stringify(spec.body));
  const headers = { ...spec.headers ?? {} };
  if (payload && !headers["content-type"]) headers["content-type"] = "application/json";
  if (payload && !headers["content-length"]) headers["content-length"] = String(Buffer.isBuffer(payload) ? payload.length : Buffer.byteLength(payload));
  return new Promise((resolve, reject) => {
    const req = reqFn(
      {
        method: spec.method,
        protocol: base.protocol,
        hostname: base.hostname,
        port: base.port || (isHttps ? 443 : 80),
        path: base.pathname + base.search,
        headers
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let parsed = raw;
          const contentType = String(res.headers["content-type"] || "");
          if (contentType.includes("application/json")) {
            try {
              parsed = JSON.parse(raw);
            } catch {
              parsed = raw;
            }
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: parsed
          });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// src/mcp/server.ts
function buildToolFromConfig(tool, baseUrl) {
  return {
    name: tool.name,
    description: tool.description,
    handler: async (args) => {
      const url = tool.url.startsWith("http") ? tool.url : baseUrl ? new URL(tool.url, baseUrl).toString() : tool.url;
      const result = await executeHttp({
        method: tool.method,
        url,
        headers: tool.headers,
        query: tool.query,
        body: tool.body
      });
      return { content: { status: result.status, headers: result.headers, body: result.body } };
    }
  };
}
async function startMcpServer(options) {
  const tools = options.config.tools.map((t) => buildToolFromConfig(t, options.config.baseUrl));
  process.stdin.setEncoding("utf8");
  let buffer = "";
  async function handleMessage(message) {
    if (message?.method === "tools/list") {
      const toolList = tools.map((t) => ({ name: t.name, description: t.description }));
      write({ jsonrpc: "2.0", id: message.id, result: { tools: toolList } });
      return;
    }
    if (message?.method === "tools/call") {
      const params = message.params;
      const tool = tools.find((t) => t.name === params.name);
      if (!tool) {
        write({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: `Tool not found: ${params.name}` } });
        return;
      }
      try {
        const result = await tool.handler(params.arguments ?? {});
        write({ jsonrpc: "2.0", id: message.id, result: { content: result.content } });
      } catch (error) {
        write({ jsonrpc: "2.0", id: message.id, error: { code: -32e3, message: String(error?.message ?? error) } });
      }
      return;
    }
    write({ jsonrpc: "2.0", id: message.id, result: null });
  }
  function write(obj) {
    const payload = JSON.stringify(obj);
    const header = `Content-Length: ${Buffer.byteLength(payload, "utf8")}\r
\r
`;
    process.stdout.write(header + payload);
  }
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    while (true) {
      const sepIndex = buffer.indexOf("\r\n\r\n");
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
        handleMessage(msg);
      } catch {
      }
    }
  });
}

// src/config/loader.ts
import fs from "fs/promises";
import path from "path";
function substituteEnv(input) {
  if (typeof input === "string") {
    return input.replace(/\$\{ENV:([A-Z0-9_]+)\}/g, (_m, varName) => {
      const value = process.env[varName];
      return value ?? "";
    });
  }
  if (Array.isArray(input)) return input.map((v) => substituteEnv(v));
  if (input && typeof input === "object") {
    const obj = input;
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = substituteEnv(v);
    return out;
  }
  return input;
}
async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const json = JSON.parse(raw);
  return substituteEnv(json);
}
async function loadConfigFromPath(configPath) {
  const stat = await fs.stat(configPath);
  if (stat.isDirectory()) {
    const mainPath = path.join(configPath, "main.json");
    const toolsPath = path.join(configPath, "tools.json");
    const main = await readJson(mainPath) ?? {};
    const tools = await readJson(toolsPath) ?? [];
    return {
      version: 1,
      tools,
      ...main
    };
  }
  return await readJson(configPath);
}

export {
  startMcpServer,
  loadConfigFromPath
};
//# sourceMappingURL=chunk-SIDCB3ZG.js.map