import type { HttpRequestSpec } from '../config/loader.js';

export type MiddlewareContext = {
  toolName: string;
  args: Record<string, unknown>;
};

export type PreMiddleware = (spec: HttpRequestSpec, context: MiddlewareContext) => Promise<HttpRequestSpec> | HttpRequestSpec;
export type PostMiddleware = (result: { status: number; headers: Record<string, string | string[]>; body: unknown }, context: MiddlewareContext) => Promise<{ status: number; headers: Record<string, string | string[]>; body: unknown }> | { status: number; headers: Record<string, string | string[]>; body: unknown };

// Example middleware functions
export const addAuthHeader: PreMiddleware = (spec, context) => {
  return {
    ...spec,
    headers: {
      ...spec.headers,
      'Authorization': 'Bearer example-token',
    },
  };
};

export const logRequest: PreMiddleware = async (spec, context) => {
  console.error(`[${context.toolName}] ${spec.method} ${spec.url}`);
  return spec;
};

export const logResponse: PostMiddleware = async (result, context) => {
  console.error(`[${context.toolName}] Response: ${result.status}`);
  return result;
};

export const addTimestamp: PreMiddleware = (spec, context) => {
  return {
    ...spec,
    headers: {
      ...spec.headers,
      'X-Timestamp': new Date().toISOString(),
    },
  };
};

export const validateResponse: PostMiddleware = async (result, context) => {
  if (result.status >= 400) {
    throw new Error(`HTTP ${result.status}: ${JSON.stringify(result.body)}`);
  }
  return result;
};
