import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';
import type { HttpRequestSpec } from '../config/loader.js';

export async function executeHttp(spec: HttpRequestSpec): Promise<{ status: number; headers: Record<string, string | string[]>; body: unknown }> {
  const base = new URL(spec.url);
  if (spec.query) {
    for (const [k, v] of Object.entries(spec.query)) base.searchParams.set(k, String(v));
  }

  const isHttps = base.protocol === 'https:';
  const reqFn = isHttps ? httpsRequest : httpRequest;

  const payload =
    spec.body === undefined || spec.body === null
      ? undefined
      : typeof spec.body === 'string' || Buffer.isBuffer(spec.body)
        ? spec.body
        : Buffer.from(JSON.stringify(spec.body));

  const headers = { ...(spec.headers ?? {}) } as Record<string, string>;
  if (payload && !headers['content-type']) headers['content-type'] = 'application/json';
  if (payload && !headers['content-length']) headers['content-length'] = String(Buffer.isBuffer(payload) ? payload.length : Buffer.byteLength(payload));

  return new Promise((resolve, reject) => {
    const req = reqFn(
      {
        method: spec.method,
        protocol: base.protocol,
        hostname: base.hostname,
        port: base.port || (isHttps ? 443 : 80),
        path: base.pathname + base.search,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.from(c)));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed: unknown = raw;
          const contentType = String(res.headers['content-type'] || '');
          if (contentType.includes('application/json')) {
            try {
              parsed = JSON.parse(raw);
            } catch {
              parsed = raw;
            }
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers as Record<string, string | string[]>,
            body: parsed,
          });
        });
      },
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}


