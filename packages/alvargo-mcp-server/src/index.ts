#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { PUBLIC_TOOL_NAMES, TOOLS } from './toolCatalog.js';

const VERSION = '1.0.0';
const GATEWAY_URL = (process.env.ALVARGO_MCP_URL || 'https://alvargo.net').replace(/\/$/, '');
const MCP_KEY = process.env.ALVARGO_MCP_KEY?.trim() || null;

function toolError(message: string) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }], isError: true };
}

async function invokeGateway(tool: string, args: Record<string, unknown>) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
    'user-agent': `alvargo-mcp-server/${VERSION}`,
  };
  if (MCP_KEY) {
    headers.authorization = `Bearer ${MCP_KEY}`;
    headers['x-alvargo-mcp-key'] = MCP_KEY;
  }

  const response = await fetch(`${GATEWAY_URL}/api/mcp/execute`, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({ tool, args }),
  });
  const data = await response.json().catch(() => ({ error: `Alvargo returned HTTP ${response.status}.` }));
  if (!response.ok) throw new Error(String(data?.error || `Alvargo returned HTTP ${response.status}.`));
  return data?.result ?? data;
}

async function main() {
  const server = new Server(
    { name: 'alvargo-mcp-server', version: VERSION },
    {
      capabilities: { tools: {} },
      instructions: 'Alvargo provides on-demand logistics capacity. Confirm with the user before any action that creates, updates, assigns, or uploads business records.',
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = TOOLS.find((entry) => entry.name === request.params.name);
    if (!tool) return toolError(`Unknown Alvargo MCP tool: ${request.params.name}.`);
    if (!PUBLIC_TOOL_NAMES.has(tool.name) && !MCP_KEY) {
      return toolError(`'${tool.name}' requires ALVARGO_MCP_KEY. Create a scoped key at https://alvargo.delivery/shipper/integrations and set it as a local environment variable.`);
    }
    try {
      const result = await invokeGateway(tool.name, (request.params.arguments || {}) as Record<string, unknown>);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return toolError(error?.message || 'Alvargo could not complete the request.');
    }
  });

  // Only structured MCP messages are written to stdout by the SDK transport.
  // Operational logs are intentionally written to stderr.
  await server.connect(new StdioServerTransport());
  console.error(`Alvargo MCP local client ${VERSION} connected to ${GATEWAY_URL}`);
}

main().catch((error) => {
  console.error('Alvargo MCP startup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
