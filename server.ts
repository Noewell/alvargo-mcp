/**
 * Alvargo MCP Server — Standalone Express Backend
 * Deployed to: alvargo.net
 * 
 * This server is completely independent from the main Alvargo platform (alvargo.delivery).
 * It handles:
 *   - /api/mcp          → SSE MCP endpoint for remote AI clients (Claude, ChatGPT)
 *   - /api/mcp/execute  → HTTP tool execution endpoint (used by local stdio NPM package)
 *   - /api/status       → No-auth health check
 *   - /.well-known/mcp.json → Served as static file from public/
 *   - /*                → Serves the React landing page (dist/)
 * 
 * The main Alvargo platform lives at alvargo.delivery (Noewell/Alvargo-LaaSv1).
 * All authenticated tool calls are proxied to alvargo.delivery's API.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 3001);

// The main Alvargo platform — all authenticated tool calls are proxied here
const MAIN_APP_URL = process.env.MAIN_APP_URL || 'https://alvargo.delivery';

// ─── Tool Definitions (mirrors alvargo-mcp-server NPM package) ───────────────
const MCP_TOOLS = [
  {
    name: 'quote_freight',
    description: 'Get an instant freight quote from Alvargo for any lane. No API key required.',
    inputSchema: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'Pickup address or city/state' },
        destination: { type: 'string', description: 'Delivery address or city/state' },
        cargo_type: { type: 'string', description: 'Type of cargo' },
        weight_lbs: { type: 'number', description: 'Total shipment weight in pounds' },
        equipment_type: {
          type: 'string',
          enum: ['DRY_VAN', 'REEFER', 'FLATBED', 'BOX_TRUCK', 'CARGO_VAN', 'STEP_DECK'],
        },
        pickup_date: { type: 'string', description: 'Pickup date YYYY-MM-DD' },
        order_value: { type: 'number', description: 'Declared cargo value in USD' },
      },
      required: ['origin', 'destination', 'cargo_type', 'weight_lbs'],
    },
  },
  {
    name: 'create_shipment',
    description: 'Book a live freight shipment on the Alvargo network. Requires MCP key.',
    inputSchema: {
      type: 'object',
      properties: {
        origin: { type: 'string' },
        destination: { type: 'string' },
        cargo_type: { type: 'string' },
        weight_lbs: { type: 'number' },
        equipment_type: { type: 'string' },
        offered_rate: { type: 'number' },
        pickup_date: { type: 'string' },
        notes: { type: 'string' },
        shipper_id: { type: 'string' },
      },
      required: ['origin', 'destination', 'cargo_type', 'weight_lbs', 'shipper_id'],
    },
  },
  {
    name: 'get_shipment',
    description: 'Track a shipment by its Alvargo Shipment ID. Requires MCP key.',
    inputSchema: {
      type: 'object',
      properties: {
        shipment_id: { type: 'string', description: 'Alvargo Shipment ID (e.g. ALV-20260805-XKQR)' },
      },
      required: ['shipment_id'],
    },
  },
  {
    name: 'update_status',
    description: 'Update the status of a shipment. Requires MCP key with update_shipment_status permission.',
    inputSchema: {
      type: 'object',
      properties: {
        shipment_id: { type: 'string' },
        new_status: {
          type: 'string',
          enum: ['pending','assigned','en_route_pickup','at_pickup','loaded','in_transit','at_delivery','delivered','pod_uploaded','completed'],
        },
        notes: { type: 'string' },
      },
      required: ['shipment_id', 'new_status'],
    },
  },
  {
    name: 'find_drivers',
    description: 'Find available Alvargo drivers near a location. Requires MCP key.',
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        radius_miles: { type: 'number' },
        vehicle_type: { type: 'string' },
      },
      required: ['location'],
    },
  },
  {
    name: 'assign_driver',
    description: 'Assign a driver to a shipment. Requires dispatcher-level MCP key.',
    inputSchema: {
      type: 'object',
      properties: {
        shipment_id: { type: 'string' },
        driver_id: { type: 'string' },
      },
      required: ['shipment_id', 'driver_id'],
    },
  },
  {
    name: 'upload_document',
    description: 'Upload a BOL, POD, or compliance document. Requires MCP key.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        document_type: { type: 'string', enum: ['bol','pod','insurance','license','registration','invoice','other'] },
        file_name: { type: 'string' },
        file_base64: { type: 'string' },
        mime_type: { type: 'string' },
        role: { type: 'string', enum: ['shipper','driver','dispatcher'] },
      },
      required: ['user_id', 'document_type', 'file_name', 'file_base64', 'mime_type', 'role'],
    },
  },
  {
    name: 'get_market_rates',
    description: 'Get live freight market rate benchmarks. No API key required.',
    inputSchema: {
      type: 'object',
      properties: {
        origin_state: { type: 'string' },
        destination_state: { type: 'string' },
        equipment_type: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'analyze_freight_image',
    description: 'AI photo-to-quote from cargo image. Requires MCP key.',
    inputSchema: {
      type: 'object',
      properties: {
        image_url: { type: 'string' },
        image_base64: { type: 'string' },
        mime_type: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'register_shipper',
    description: 'Create a new Alvargo shipper account. Public — no key required.',
    inputSchema: {
      type: 'object',
      properties: {
        company_name: { type: 'string' },
        email: { type: 'string' },
        contact_name: { type: 'string' },
        phone: { type: 'string' },
      },
      required: ['company_name', 'email'],
    },
  },
];

// ─── Auth helpers ─────────────────────────────────────────────────────────────
const PUBLIC_TOOLS = new Set(['quote_freight', 'get_market_rates', 'register_shipper']);

function extractMcpKey(req: express.Request): string | null {
  const header = req.headers['x-alvargo-mcp-key'] as string;
  if (header) return header;
  const auth = req.headers['authorization'] as string;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function requiresAuth(toolName: string): boolean {
  return !PUBLIC_TOOLS.has(toolName);
}

// ─── Proxy tool call to main app ──────────────────────────────────────────────
async function proxyToolCall(
  toolName: string,
  args: Record<string, unknown>,
  mcpKey: string | null
): Promise<{ success: boolean; result?: unknown; error?: string; status?: number }> {
  const { default: axios } = await import('axios');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'alvargo-mcp/1.0.0',
  };
  if (mcpKey) {
    headers['Authorization'] = `Bearer ${mcpKey}`;
    headers['x-alvargo-mcp-key'] = mcpKey;
  }

  // Map MCP tool names to main app internal tool names
  const toolMap: Record<string, string> = {
    quote_freight: 'calculate_price',
    create_shipment: 'create_shipment',
    get_shipment: 'get_shipment_details',
    update_status: 'update_shipment_status',
    find_drivers: 'get_available_drivers',
    assign_driver: 'assign_driver_to_shipment',
    upload_document: 'upload_document',
    get_market_rates: 'get_market_rates',
    analyze_freight_image: 'analyze_freight_image',
    register_shipper: 'register_shipper',
  };

  // Map MCP snake_case args to main app camelCase args
  const argMap: Record<string, Record<string, string>> = {
    quote_freight: {
      cargo_type: 'cargoType', weight_lbs: 'weightLbs',
      equipment_type: 'equipmentNeeded', pickup_date: 'pickupDate',
      order_value: 'orderValue',
    },
    create_shipment: {
      cargo_type: 'cargoType', weight_lbs: 'weightLbs',
      equipment_type: 'equipmentNeeded', offered_rate: 'offeredRate',
      pickup_date: 'pickupDate', shipper_id: 'shipperId',
    },
    get_shipment: { shipment_id: 'shipmentId' },
    update_status: { shipment_id: 'shipmentId', new_status: 'newStatus' },
    find_drivers: { radius_miles: 'radiusMiles', vehicle_type: 'vehicleType', location: 'currentLocation' },
    assign_driver: { shipment_id: 'shipmentId', driver_id: 'driverId' },
    upload_document: {
      user_id: 'userId', document_type: 'documentType',
      file_name: 'fileName', file_base64: 'fileBase64', mime_type: 'mimeType',
    },
    register_shipper: {
      company_name: 'companyName', contact_name: 'contactName',
    },
  };

  // Remap args
  const remappedArgs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    const mapped = argMap[toolName]?.[k];
    remappedArgs[mapped || k] = v;
  }

  try {
    const response = await axios.post(
      `${MAIN_APP_URL}/api/mcp/execute`,
      {
        toolName: toolMap[toolName] || toolName,
        arguments: remappedArgs,
        // Kept during the rollout so legacy clients can be upgraded without downtime.
        tool: toolMap[toolName] || toolName,
        args: remappedArgs,
      },
      { headers, timeout: 15000 }
    );
    return { success: true, result: response.data.result ?? response.data };
  } catch (err: any) {
    const status = err.response?.status;
    const message = err.response?.data?.error || err.message;
    return { success: false, error: message, status };
  }
}

// ─── Express App ──────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();

  // Security middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-alvargo-mcp-key'],
  }));

  // Rate limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(globalLimiter);

  const mcpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 60,
    message: { error: 'MCP rate limit exceeded.' },
  });
  app.use('/api/mcp', mcpLimiter);

  app.use(express.json({ limit: '10mb' }));

  // ── Static files (landing page + discovery manifest) ────────────────────────
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  // Explicitly serve .well-known from public/ in dev, dist/ in prod
  app.use('/.well-known', express.static(path.join(__dirname, 'public', '.well-known')));

  // ── Health check ─────────────────────────────────────────────────────────────
  app.get('/api/status', (_req, res) => {
    res.json({
      status: 'operational',
      service: 'Alvargo MCP Server',
      version: '1.0.0',
      domain: 'alvargo.net',
      main_platform: 'alvargo.delivery',
      remote_url: 'https://alvargo.net/api/mcp',
      npm_package: 'alvargo-mcp-server',
      tools_count: MCP_TOOLS.length,
      public_tools: Array.from(PUBLIC_TOOLS),
      timestamp: new Date().toISOString(),
    });
  });

  // ── List tools ───────────────────────────────────────────────────────────────
  app.get('/api/mcp/tools', (_req, res) => {
    res.json({ tools: MCP_TOOLS });
  });

  // ── HTTP tool execution endpoint (used by NPM stdio package) ─────────────────
  app.post('/api/mcp/execute', async (req, res) => {
    const { tool, args = {} } = req.body;

    if (!tool || typeof tool !== 'string') {
      return res.status(400).json({ error: 'Missing required field: tool' });
    }

    const knownTool = MCP_TOOLS.find((t) => t.name === tool || t.name === tool.replace(/_/g, '_'));
    if (!knownTool) {
      return res.status(404).json({ error: `Unknown tool: ${tool}` });
    }

    const mcpKey = extractMcpKey(req);

    if (requiresAuth(tool) && !mcpKey) {
      return res.status(401).json({
        error: 'Authentication required.',
        message: `The '${tool}' tool requires an Alvargo MCP Key. Generate one at https://alvargo.delivery/shipper/integrations.`,
        public_tools: Array.from(PUBLIC_TOOLS),
      });
    }

    // Audit log
    console.log(JSON.stringify({
      event: 'mcp_tool_call',
      tool,
      key_prefix: mcpKey ? mcpKey.substring(0, 16) + '...' : 'public',
      ip: req.ip,
      timestamp: new Date().toISOString(),
    }));

    const result = await proxyToolCall(tool, args, mcpKey);

    if (!result.success) {
      if (result.status === 401) {
        return res.status(401).json({
          error: 'Invalid or expired MCP key.',
          message: 'Generate a new key at https://alvargo.delivery/shipper/integrations',
        });
      }
      if (result.status === 403) {
        return res.status(403).json({
          error: 'Permission denied.',
          message: `Your MCP key does not have permission for '${tool}'. Update RBAC settings at https://alvargo.delivery/shipper/integrations.`,
        });
      }
      return res.status(502).json({ error: result.error || 'Upstream error' });
    }

    res.json({ success: true, result: result.result });
  });

  // ── SSE MCP endpoint (for Claude remote connector) ────────────────────────────
  app.get('/api/mcp', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial capabilities
    const initMessage = {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {
        serverInfo: { name: 'alvargo-mcp', version: '1.0.0' },
        capabilities: { tools: {} },
      },
    };
    res.write(`data: ${JSON.stringify(initMessage)}\n\n`);

    // Keep-alive ping every 20s
    const ping = setInterval(() => {
      res.write(': ping\n\n');
    }, 20000);

    req.on('close', () => clearInterval(ping));
  });

  app.post('/api/mcp', async (req, res) => {
    const { method, params, id } = req.body;

    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS },
      });
    }

    if (method === 'tools/call') {
      const { name, arguments: args = {} } = params;
      const mcpKey = extractMcpKey(req);

      if (requiresAuth(name) && !mcpKey) {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Authentication required.',
                message: `The '${name}' tool requires an Alvargo MCP Key. Generate one at https://alvargo.delivery/shipper/integrations.`,
                public_tools: Array.from(PUBLIC_TOOLS),
              }),
            }],
            isError: true,
          },
        });
      }

      const result = await proxyToolCall(name, args, mcpKey);

      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{
            type: 'text',
            text: result.success
              ? JSON.stringify(result.result, null, 2)
              : JSON.stringify({ error: result.error }),
          }],
          isError: !result.success,
        },
      });
    }

    res.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  });

  // ── SPA fallback ─────────────────────────────────────────────────────────────
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Alvargo MCP Server running on port ${PORT}`);
    console.log(`Domain: https://alvargo.net`);
    console.log(`Main platform: ${MAIN_APP_URL}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
