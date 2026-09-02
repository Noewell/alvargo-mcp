# Alvargo MCP

The official [Model Context Protocol](https://modelcontextprotocol.io/) gateway for **Alvargo**, the Logistics-as-a-Service operating system.

| Domain | Role |
|---|---|
| [alvargo.delivery](https://alvargo.delivery) | Authoritative Alvargo platform: shipper portal, dispatching, drivers, pricing, scoped-key authorization, and audit records. |
| [alvargo.net](https://alvargo.net/agents/mcp) | Independently deployed public MCP gateway, discovery page, and developer distribution hub. |

The separation prevents the public AI gateway from becoming part of the main application deployment. The MCP gateway owns no logistics records; authenticated operations are validated and performed only by `alvargo.delivery`.

## Phase 1 public launch

The hosted endpoint uses modern **MCP Streamable HTTP**:

```text
https://alvargo.net/api/mcp
```

Public MCP tools are available from the hosted endpoint:

- `quote_freight`
- `get_market_rates`
- `register_shipper`

Shipper-private tools use a scoped, expiring `ALV_MCP_SEC_...` key through the published local client package. This is deliberate: Phase 1 does not put bearer keys in browser storage, URLs, or public documentation. OAuth browser consent for hosted private tools is planned as a future release.

## Local client installation

The local client is published as [`alvargo-mcp-server`](https://www.npmjs.com/package/alvargo-mcp-server).

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

Create, scope, rotate, or revoke the key from [Alvargo Shipper Integrations](https://alvargo.delivery/shipper/integrations).

## Hosting

This repository is deployed as a **separate Netlify project** with `alvargo.net` attached as its production domain. Netlify builds the Vite landing site and routes `/api/*` to a request-scoped Function. The Function runs a stateless MCP Streamable HTTP gateway, which is compatible with serverless execution because it does not rely on a long-lived SSE connection or gateway memory.

### Required Netlify environment variables

```dotenv
MAIN_APP_URL=https://alvargo.delivery
MCP_PUBLIC_URL=https://alvargo.net
```

No Alvargo shipper key, Firebase credential, Stripe secret, or AI provider key belongs in this repository or Netlify project. Those services remain inside `Alvargo-LaaSv1`.

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/mcp` | `POST` | Standards-based MCP Streamable HTTP endpoint. |
| `/api/mcp/execute` | `POST` | Direct gateway API used by the local client and public web quote demo. |
| `/api/mcp/tools` | `GET` | Public tool catalog. |
| `/api/status` | `GET` | Public service health and transport status. |
| `/.well-known/mcp.json` | `GET` | Public discovery document. |
| `/agents/mcp` | `GET` | Human-facing installation and tool guide. |

## Security boundary

- The gateway validates browser origins, uses security headers, and limits gateway and MCP request rates.
- Private operations require a shipper-issued scoped MCP key.
- Keys are sent only in HTTPS request headers and never stored by the hosted gateway.
- `alvargo.delivery` enforces the definitive key status, 90-day expiry, RBAC tool permissions, tenant scope, input sanitization, prompt-injection protections, pricing, and audit logging.
- The remote gateway does not bypass, duplicate, or weaken core Alvargo authorization.

## Development

```bash
npm install
npm run build
npm run netlify:dev
```

To test a public tool once deployed:

```bash
curl https://alvargo.net/api/status
```

## Publication

1. Create the independent Netlify site and link `Noewell/alvargo-mcp` on `main`.
2. Set `MAIN_APP_URL` and `MCP_PUBLIC_URL` in Netlify.
3. Attach `alvargo.net` and complete DNS/HTTPS verification.
4. Publish the local package from `packages/alvargo-mcp-server` using the Alvargo-owned npm publisher account.
5. Submit the repository to an MCP directory only after verifying the public discovery URL, tool catalog, and health endpoint.

## Support

Contact [support@alvargo.us](mailto:support@alvargo.us).

## License

MIT © 2026 Alvargo
