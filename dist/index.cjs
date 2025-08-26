"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  addAuthHeader: () => addAuthHeader,
  addTimestamp: () => addTimestamp,
  default: () => index_default,
  greet: () => greet,
  loadConfigFromPath: () => loadConfigFromPath,
  logRequest: () => logRequest,
  logResponse: () => logResponse,
  startMcpServer: () => startMcpServer,
  validateResponse: () => validateResponse
});
module.exports = __toCommonJS(index_exports);

// src/config/loader.ts
var import_promises = __toESM(require("fs/promises"), 1);
var import_node_path = __toESM(require("path"), 1);
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
  const raw = await import_promises.default.readFile(filePath, "utf8");
  const json = JSON.parse(raw);
  return substituteEnv(json);
}
async function loadConfigFromPath(configPath) {
  const stat = await import_promises.default.stat(configPath);
  if (stat.isDirectory()) {
    const toolsPath = import_node_path.default.join(configPath, "tools.json");
    const parsed = await readJson(toolsPath);
    if (Array.isArray(parsed)) {
      return { version: 1, tools: parsed };
    }
    const obj = parsed ?? {};
    return {
      version: obj.version ?? 1,
      baseUrl: obj.baseUrl,
      tools: obj.tools ?? []
    };
  }
  return await readJson(configPath);
}

// src/http/executor.ts
var import_node_http = require("http");
var import_node_https = require("https");
var import_node_url = require("url");
async function executeHttp(spec) {
  const base = new import_node_url.URL(spec.url);
  if (spec.query) {
    for (const [k, v] of Object.entries(spec.query)) base.searchParams.set(k, String(v));
  }
  const isHttps = base.protocol === "https:";
  const reqFn = isHttps ? import_node_https.request : import_node_http.request;
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

// src/middleware/index.ts
var middleware_exports = {};
__export(middleware_exports, {
  addAuthHeader: () => addAuthHeader,
  addTimestamp: () => addTimestamp,
  logRequest: () => logRequest,
  logResponse: () => logResponse,
  validateResponse: () => validateResponse
});
var addAuthHeader = (spec, context) => {
  return {
    ...spec,
    headers: {
      ...spec.headers,
      "Authorization": "Bearer example-token"
    }
  };
};
var logRequest = async (spec, context) => {
  console.error(`[${context.toolName}] ${spec.method} ${spec.url}`);
  return spec;
};
var logResponse = async (result, context) => {
  console.error(`[${context.toolName}] Response: ${result.status}`);
  return result;
};
var addTimestamp = (spec, context) => {
  return {
    ...spec,
    headers: {
      ...spec.headers,
      "X-Timestamp": (/* @__PURE__ */ new Date()).toISOString()
    }
  };
};
var validateResponse = async (result, context) => {
  if (result.status >= 400) {
    throw new Error(`HTTP ${result.status}: ${JSON.stringify(result.body)}`);
  }
  return result;
};

// src/mcp/server.ts
function getMiddlewareFunction(name) {
  const fn = middleware_exports[name];
  if (!fn || typeof fn !== "function") {
    throw new Error(`Middleware function "${name}" not found. Available: ${Object.keys(middleware_exports).join(", ")}`);
  }
  return fn;
}
function buildToolFromConfig(tool) {
  return {
    name: tool.name,
    description: tool.description,
    handler: async (args) => {
      if (!/^https?:\/\//i.test(tool.url)) {
        throw new Error(`Tool ${tool.name} requires an absolute URL (got: ${tool.url})`);
      }
      const context = {
        toolName: tool.name,
        args
      };
      let httpSpec = {
        method: tool.method,
        url: tool.url,
        headers: tool.headers,
        query: tool.query,
        body: tool.body
      };
      if (tool.preMiddleware) {
        for (const middlewareName of tool.preMiddleware) {
          const preFn = getMiddlewareFunction(middlewareName);
          httpSpec = await preFn(httpSpec, context);
        }
      }
      const result = await executeHttp(httpSpec);
      let finalResult = result;
      if (tool.postMiddleware) {
        for (const middlewareName of tool.postMiddleware) {
          const postFn = getMiddlewareFunction(middlewareName);
          finalResult = await postFn(finalResult, context);
        }
      }
      return { content: finalResult };
    }
  };
}
async function startMcpServer(options) {
  const tools = options.config.tools.map((t) => buildToolFromConfig(t));
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

// src/index.ts
function greet(name) {
  return `Hello, ${name}!`;
}
var index_default = {
  greet
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addAuthHeader,
  addTimestamp,
  greet,
  loadConfigFromPath,
  logRequest,
  logResponse,
  startMcpServer,
  validateResponse
});
//# sourceMappingURL=index.cjs.map