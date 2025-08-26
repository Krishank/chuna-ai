type ToolConfig = {
    name: string;
    description?: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
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

declare function greet(name: string): string;
declare const _default: {
    greet: typeof greet;
};

export { type ChunaConfig, type ToolConfig, _default as default, greet, loadConfigFromPath, startMcpServer };
