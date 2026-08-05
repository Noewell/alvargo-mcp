# Alvargo MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The official [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for the **Alvargo Freight OS**.

Deployed at **[alvargo.net](https://alvargo.net)** — fully independent from the main Alvargo platform ([alvargo.delivery](https://alvargo.delivery)).

## Architecture

```
alvargo.delivery   →  Main platform (shipper portal, dispatcher, driver app)
alvargo.net        →  This repo — MCP server + landing page
```

This separation ensures no single point of failure. The MCP server proxies authenticated tool calls to `alvargo.delivery` but serves its own landing page, discovery manifest, and health endpoint independently.

## Quick Start (No install needed)

Paste the remote connector URL into Claude:

1. Go to **Settings → Connectors → Add custom connector**
2. Paste: `https://alvargo.net/api/mcp`
3. Click **Add**

Or use the Claude Code CLI:
```bash
claude mcp add --transport http alvargo https://alvargo.net/api/mcp
```

## Local Installation (Cursor, Windsurf, Claude Desktop)

```json
{
  "mcpServers": {
    "alvargo": {
      "command": "npx",
      "args": ["-y", "alvargo-mcp-server"]
    }
  }
}
```

## Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/mcp` | GET | No | SSE stream for remote AI clients |
| `/api/mcp` | POST | Conditional | JSON-RPC tool execution |
| `/api/mcp/execute` | POST | Conditional | HTTP tool execution (used by NPM package) |
| `/api/mcp/tools` | GET | No | List all available tools |
| `/api/status` | GET | No | Health check |
| `/.well-known/mcp.json` | GET | No | MCP discovery manifest |

## Development

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env

# Start the dev server (hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

See `.env.example` for all required variables. The key one is:

```
MAIN_APP_URL=https://alvargo.delivery
```

This tells the MCP server where to proxy authenticated tool calls.

## Available Tools

| Tool | Auth Required | Description |
|------|---------------|-------------|
| `quote_freight` | No | Instant freight quote for any lane |
| `get_market_rates` | No | Live market rate benchmarks |
| `register_shipper` | No | Create a new Alvargo shipper account |
| `create_shipment` | Yes | Book a live shipment |
| `get_shipment` | Yes | Track a shipment by ID |
| `update_status` | Yes | Update shipment status |
| `find_drivers` | Yes | Find available drivers near a location |
| `assign_driver` | Yes | Assign a driver to a shipment |
| `upload_document` | Yes | Upload BOL, POD, or compliance docs |
| `analyze_freight_image` | Yes | AI photo-to-quote from cargo image |

## License

MIT © 2026 Alvargo
