# Alvargo MCP Server

The official local [Model Context Protocol](https://modelcontextprotocol.io/) client for **Alvargo**, the Logistics-as-a-Service operating system.

This package exposes Alvargo freight tools to Claude Desktop, Claude Code, Cursor, Windsurf, and compatible MCP clients. The hosted gateway runs independently at [alvargo.net](https://alvargo.net); shipment records, pricing, scoped-key authorization, and audit logging remain authoritative in [Alvargo-LaaSv1](https://alvargo.delivery).

## Install

No global installation is required. Configure your MCP client to invoke the package through `npx`.

### Claude Desktop / Cursor / Windsurf

```json
{
  "mcpServers": {
    "alvargo": {
      "command": "npx",
      "args": ["-y", "alvargo-mcp-server"],
      "env": {
        "ALVARGO_MCP_KEY": "ALV_MCP_SEC_your_scoped_key"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add --transport stdio alvargo \
  --env ALVARGO_MCP_KEY=ALV_MCP_SEC_your_scoped_key \
  -- npx -y alvargo-mcp-server
```

Create, scope, rotate, or revoke the key at **Alvargo → Shipper Integrations → AI Agents & MCP**: <https://alvargo.delivery/shipper/integrations>.

## Security

- Do not put `ALVARGO_MCP_KEY` in a URL, chat message, repository, or browser storage.
- The key is sent only in an HTTPS authorization header to `https://alvargo.net`.
- Shippers choose which private tools each key can call. Keys expire and can be revoked.
- Public tools—`quote_freight`, `get_market_rates`, and `register_shipper`—do not require a key.
- Alvargo-LaaSv1 validates the key, enforces tenant scope and tool permissions, calculates authoritative prices, and records audit events.

## Available tools

| Tool | MCP key required | Purpose |
|---|---:|---|
| `quote_freight` | No | Get an Alvargo freight quote. |
| `get_market_rates` | No | Get freight market-rate benchmarks. |
| `register_shipper` | No | Register a prospective Alvargo shipper. |
| `create_shipment` | Yes | Create a live shipper-scoped shipment. |
| `get_shipment` | Yes | Retrieve a shipper-scoped shipment. |
| `update_status` | Yes | Update an authorized shipment status. |
| `find_drivers` | Yes | Find available capacity. |
| `assign_driver` | Yes | Assign a driver to a shipment. |
| `upload_document` | Yes | Upload an authorized freight document. |
| `analyze_freight_image` | Yes | Use photo-to-quote analysis. |

## Configuration

| Variable | Required | Default | Description |
|---|---:|---|---|
| `ALVARGO_MCP_KEY` | For private tools | None | Scoped shipper MCP key (`ALV_MCP_SEC_...`). |
| `ALVARGO_MCP_URL` | No | `https://alvargo.net` | Override only for local test environments. |

## Support

Contact [support@alvargo.us](mailto:support@alvargo.us). Source and issue tracking: <https://github.com/Noewell/alvargo-mcp>.

## License

MIT © Alvargo
