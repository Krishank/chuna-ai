import fs from 'node:fs/promises';
import path from 'node:path';

export type ToolConfig = {
  name: string;
  description?: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
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
    const mainPath = path.join(configPath, 'main.json');
    const toolsPath = path.join(configPath, 'tools.json');
    const main: Partial<ChunaConfig> = (await readJson(mainPath)) ?? {};
    const tools: ToolConfig[] = (await readJson(toolsPath)) ?? [];
    return {
      version: 1,
      tools,
      ...main,
    } as ChunaConfig;
  }
  return (await readJson(configPath)) as ChunaConfig;
}


