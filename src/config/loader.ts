import fs from 'node:fs/promises';
import path from 'node:path';

// Middleware types - functions exported from middleware/index.ts
export type PreMiddleware = (spec: HttpRequestSpec, context: MiddlewareContext) => Promise<HttpRequestSpec> | HttpRequestSpec;
export type PostMiddleware = (result: { status: number; headers: Record<string, string | string[]>; body: unknown }, context: MiddlewareContext) => Promise<{ status: number; headers: Record<string, string | string[]>; body: unknown }> | { status: number; headers: Record<string, string | string[]>; body: unknown };

export type MiddlewareContext = {
  toolName: string;
  args: Record<string, unknown>;
};

export type HttpRequestSpec = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
};

export type ToolConfig = {
  name: string;
  description?: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  preMiddleware?: string[];
  postMiddleware?: string[];
};

export type ChunaConfig = {
  version?: number;
  baseUrl?: string;
  tools: ToolConfig[];
};

function substituteEnv(input: unknown): unknown {
  if (typeof input === 'string') {
    return input.replace(/\$\{ENV:([A-Z0-9_]+)\}/g, (_m, varName: string) => {
      const value = process.env[varName];
      return value ?? '';
    });
  }
  if (Array.isArray(input)) return input.map((v) => substituteEnv(v));
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = substituteEnv(v);
    return out;
  }
  return input;
}

async function readJson(filePath: string): Promise<any> {
  const raw = await fs.readFile(filePath, 'utf8');
  const json = JSON.parse(raw);
  return substituteEnv(json);
}

export async function loadConfigFromPath(configPath: string): Promise<ChunaConfig> {
  const stat = await fs.stat(configPath);
  if (stat.isDirectory()) {
    const toolsPath = path.join(configPath, 'tools.json');
    const parsed = await readJson(toolsPath);
    // Support two shapes:
    // 1) { baseUrl?: string, tools: ToolConfig[] }
    // 2) ToolConfig[] (legacy) -> wrap into { tools }
    if (Array.isArray(parsed)) {
      return { version: 1, tools: parsed } as ChunaConfig;
    }
    const obj = (parsed ?? {}) as Partial<ChunaConfig> & { tools?: ToolConfig[] };
    return {
      version: obj.version ?? 1,
      baseUrl: obj.baseUrl,
      tools: obj.tools ?? [],
    } as ChunaConfig;
  }
  return (await readJson(configPath)) as ChunaConfig;
}


