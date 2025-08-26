type PreMiddleware$1 = (spec: HttpRequestSpec, context: MiddlewareContext$1) => Promise<HttpRequestSpec> | HttpRequestSpec;
type PostMiddleware$1 = (result: {
    status: number;
    headers: Record<string, string | string[]>;
    body: unknown;
}, context: MiddlewareContext$1) => Promise<{
    status: number;
    headers: Record<string, string | string[]>;
    body: unknown;
}> | {
    status: number;
    headers: Record<string, string | string[]>;
    body: unknown;
};
type MiddlewareContext$1 = {
    toolName: string;
    args: Record<string, unknown>;
};
type HttpRequestSpec = {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
};
type ToolConfig = {
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
type ChunaConfig = {
    version?: number;
    baseUrl?: string;
    tools: ToolConfig[];
};
declare function loadConfigFromPath(configPath: string): Promise<ChunaConfig>;

type StartOptions = {
    config: ChunaConfig;
};
declare function startMcpServer(options: StartOptions): Promise<void>;

type MiddlewareContext = {
    toolName: string;
    args: Record<string, unknown>;
};
type PreMiddleware = (spec: HttpRequestSpec, context: MiddlewareContext) => Promise<HttpRequestSpec> | HttpRequestSpec;
type PostMiddleware = (result: {
    status: number;
    headers: Record<string, string | string[]>;
    body: unknown;
}, context: MiddlewareContext) => Promise<{
    status: number;
    headers: Record<string, string | string[]>;
    body: unknown;
}> | {
    status: number;
    headers: Record<string, string | string[]>;
    body: unknown;
};
declare const addAuthHeader: PreMiddleware;
declare const logRequest: PreMiddleware;
declare const logResponse: PostMiddleware;
declare const addTimestamp: PreMiddleware;
declare const validateResponse: PostMiddleware;

declare function greet(name: string): string;
declare const _default: {
    greet: typeof greet;
};

export { type ChunaConfig, type HttpRequestSpec, type MiddlewareContext$1 as MiddlewareContext, type PostMiddleware$1 as PostMiddleware, type PreMiddleware$1 as PreMiddleware, type ToolConfig, addAuthHeader, addTimestamp, _default as default, greet, loadConfigFromPath, logRequest, logResponse, startMcpServer, validateResponse };
