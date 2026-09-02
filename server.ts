/**
 * Alvargo MCP Gateway
 *
 * The public gateway is deployed independently at alvargo.net. It owns no
 * shipment, pricing, driver, key, or audit state. All tool calls are forwarded
 * to the authoritative Alvargo-LaaSv1 API at alvargo.delivery, where scoped
 * MCP keys, pricing, tenant boundaries, and audit records are enforced.
 *
 * Remote transport: MCP Streamable HTTP (stateless) at /api/mcp.
 * Local transport: the separately published alvargo-mcp-server NPM package.
 */

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  MCP_TOOLS,
  MAIN_PLATFORM_ARGUMENT_MAP,
  MAIN_PLATFORM_TOOL_MAP,
  PUBLIC_TOOL_NAMES,
} from './src/toolCatalog.js';

dotenv.config();

const SERVER_NAME = 'alvargo-mcp';
const SERVER_VERSION = '1.0.0';
const PORT = Number(process.env.PORT || 3001);
const MAIN_APP_URL = (process.env.MAIN_APP_URL || 'https://alvargo.delivery').replace(/\/$/, '');
const MCP_PUBLIC_URL = (process.env.MCP_PUBLIC_URL || 'https://alvargo.net').replace(/\/$/, '');
const IS_SERVERLESS_RUNTIME = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
// Netlify bundles Functions as CommonJS. process.cwd() is reliable for the local
// standalone start command and avoids import.meta, which is unavailable there.
const projectRoot = process.cwd();

const browserOrigins = new Set([
  MCP_PUBLIC_URL,
  'https://alvargo.net',
  'https://www.alvargo.net',
  'http://localhost:5173',
  'http://localhost:3001',
]);

function extractMcpKey(req: Request): string | null {
  const explicitKey = req.headers['x-alvargo-mcp-key'];
  if (typeof explicitKey === 'string' && explicitKey.trim()) return explicitKey.trim();
  const authorization = req.headers.authorization;
  if (typeof authorization === 'string' && /^Bearer\s+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, '').trim() || null;
  }
  return null;
}

function validateBrowserOrigin(req: Request, res: Response): boolean {
  const origin = req.headers.origin;
  // MCP desktop/server clients often omit Origin. Browser-originated requests
  // must be same-origin or one of the configured development origins.
  if (!origin || browserOrigins.has(origin)) return true;
  res.status(403).json({ error: 'Origin is not allowed by Alvargo MCP policy.' });
  return false;
}

function remapArguments(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
  const mapping = MAIN_PLATFORM_ARGUMENT_MAP[toolName] || {};
  return Object.fromEntries(Object.entries(args).map(([key, value]) => [mapping[key] || key, value]));
}

async function proxyToolCall(
  toolName: string,
  args: Record<string, unknown>,
  mcpKey: string | null,
): Promise<{ success: boolean; result?: unknown; error?: string; status?: number }> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
    'user-agent': `${SERVER_NAME}/${SERVER_VERSION}`,
    'x-alvargo-gateway': 'alvargo.net',
  };
  if (mcpKey) {
    headers.authorization = `Bearer ${mcpKey}`;
    headers['x-alvargo-mcp-key'] = mcpKey;
  }

  try {
    const response = await fetch(`${MAIN_APP_URL}/api/mcp/execute`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        toolName: MAIN_PLATFORM_TOOL_MAP[toolName] || toolName,
        arguments: remapArguments(toolName, args),
      }),
    });
    const payload = await response.json().catch(() => ({ error: 'The authoritative Alvargo API returned an invalid response.' }));
    if (!response.ok) {
      return { success: false, error: String(payload?.error || `Alvargo API returned HTTP ${response.status}.`), status: response.status };
    }
    return { success: true, result: payload?.result ?? payload };
  } catch (error: any) {
    const isTimeout = error?.name === 'TimeoutError';
    return { success: false, error: isTimeout ? 'The Alvargo platform request timed out.' : 'The Alvargo platform is temporarily unavailable.', status: 502 };
  }
}

function toolError(message: string) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }], isError: true };
}

function createProtocolServer(mcpKey: string | null) {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { tools: {} },
      instructions: 'Alvargo is a Logistics-as-a-Service operating system. Use public tools for exploration. Before invoking a private tool, ask the user for confirmation and ensure their scoped Alvargo MCP key authorizes that tool.',
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: MCP_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments || {};
    const knownTool = MCP_TOOLS.find((tool) => tool.name === toolName);
    if (!knownTool) return toolError(`Unknown Alvargo MCP tool: ${toolName}.`);
    if (!PUBLIC_TOOL_NAMES.has(toolName) && !mcpKey) {
      return toolError(`The '${toolName}' tool requires a scoped Alvargo MCP key. Create or manage one at https://alvargo.delivery/shipper/integrations.`);
    }

    const result = await proxyToolCall(toolName, args as Record<string, unknown>, mcpKey);
    if (!result.success) return toolError(result.error || 'Alvargo could not complete this tool call.');
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.result, null, 2) }] };
  });

  return server;
}

async function handleMcpRequest(req: Request, res: Response) {
  if (!validateBrowserOrigin(req, res)) return;
  const mcpKey = extractMcpKey(req);
  const server = createProtocolServer(mcpKey);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP Streamable HTTP request failed:', error instanceof Error ? error.message : error);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal MCP server error.' }, id: null });
    }
  } finally {
    res.once('close', () => {
      void transport.close();
      void server.close();
    });
  }
}

export function createAlvargoMcpApp() {
  const app = express();
  // Netlify supplies the original client IP through one trusted reverse proxy.
  // Trusting exactly one hop lets rate limits use that IP without trusting an
  // attacker-controlled chain of forwarded headers.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || browserOrigins.has(origin)) return callback(null, true);
      callback(new Error('Origin is not allowed by Alvargo MCP policy.'));
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Mcp-Session-Id', 'x-alvargo-mcp-key'],
    exposedHeaders: ['Mcp-Session-Id'],
    maxAge: 600,
  }));

  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  }));
  app.use('/api/mcp', rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'MCP rate limit exceeded.' },
  }));
  app.use(express.json({ limit: '10mb', type: ['application/json', 'application/*+json'] }));

  app.get('/api/status', (_req, res) => {
    res.json({
      status: 'operational',
      service: 'Alvargo MCP Gateway',
      version: SERVER_VERSION,
      domain: 'alvargo.net',
      mainPlatform: MAIN_APP_URL,
      remoteUrl: `${MCP_PUBLIC_URL}/api/mcp`,
      protocol: 'MCP Streamable HTTP',
      localClient: 'alvargo-mcp-server',
      tools: MCP_TOOLS.length,
      publicTools: [...PUBLIC_TOOL_NAMES],
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/mcp/tools', (req, res) => {
    if (!validateBrowserOrigin(req, res)) return;
    res.json({ tools: MCP_TOOLS.map(({ name, description, inputSchema, public: isPublic }) => ({ name, description, inputSchema, public: isPublic })) });
  });

  // Direct HTTP interface used by the local NPM client and the landing-page demo.
  app.post('/api/mcp/execute', async (req, res) => {
    if (!validateBrowserOrigin(req, res)) return;
    const toolName = typeof req.body?.tool === 'string' ? req.body.tool : req.body?.toolName;
    const args = req.body?.args ?? req.body?.arguments ?? {};
    const knownTool = MCP_TOOLS.find((tool) => tool.name === toolName);
    if (!knownTool) return res.status(400).json({ error: 'Unsupported Alvargo MCP tool.' });
    if (!args || typeof args !== 'object' || Array.isArray(args)) return res.status(400).json({ error: 'Tool arguments must be an object.' });

    const mcpKey = extractMcpKey(req);
    if (!knownTool.public && !mcpKey) {
      return res.status(401).json({ error: 'A scoped Alvargo MCP key is required for this tool.', keyManagementUrl: 'https://alvargo.delivery/shipper/integrations' });
    }
    const result = await proxyToolCall(knownTool.name, args as Record<string, unknown>, mcpKey);
    if (!result.success) return res.status(result.status || 502).json({ error: result.error || 'Alvargo platform request failed.' });
    return res.json({ success: true, result: result.result });
  });

  // Current MCP Streamable HTTP endpoint. A stateless transport is intentional:
  // Netlify Functions can independently handle each request without retaining a
  // connection or key in memory between invocations.
  app.post('/api/mcp', handleMcpRequest);
  app.get('/api/mcp', (req, res) => {
    if (!validateBrowserOrigin(req, res)) return;
    res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'GET is not used by Alvargo’s stateless Streamable HTTP endpoint.' }, id: null });
  });
  app.delete('/api/mcp', (req, res) => {
    if (!validateBrowserOrigin(req, res)) return;
    res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'The stateless endpoint has no server-side session to terminate.' }, id: null });
  });

  if (!IS_SERVERLESS_RUNTIME) {
    const distPath = path.join(projectRoot, 'dist');
    const discoveryPath = path.join(projectRoot, 'public', '.well-known');
    app.use('/.well-known', express.static(discoveryPath));
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  return app;
}

if (!IS_SERVERLESS_RUNTIME) {
  const app = createAlvargoMcpApp();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Alvargo MCP Gateway listening on port ${PORT}`);
    console.log(`Public MCP endpoint: ${MCP_PUBLIC_URL}/api/mcp`);
    console.log(`Authoritative platform: ${MAIN_APP_URL}`);
  });
}
