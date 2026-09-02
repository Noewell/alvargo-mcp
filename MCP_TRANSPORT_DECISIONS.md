# Alvargo MCP Transport Decisions

## Production decision

Alvargo MCP uses **stateless Streamable HTTP** at `https://alvargo.net/api/mcp`. The deployed public gateway is independent from `alvargo.delivery`, while the main platform remains the source of truth for pricing, scoped MCP-key validation, tenant authorization, shipment creation, and audit records.

## Why this transport

The MCP specification identifies Streamable HTTP as the current remote transport and states that it replaces the older HTTP+SSE transport. A Streamable HTTP MCP endpoint supports JSON-RPC `POST` requests and may optionally expose GET/SSE; a stateless endpoint may reject GET when it does not offer standalone server-to-client streams. This permits deployment as a request-scoped Netlify Function without keeping a long-lived SSE connection or session state in memory.

The specification further requires Origin validation for incoming connections, recommends proper authentication, and documents `Mcp-Session-Id` behavior for stateful services. The Alvargo Phase 1 gateway has no stored gateway session and performs only request-scoped proxying, so it intentionally uses stateless transport. Authentication for private tools stays in Alvargo-LaaSv1's scoped, tenant-bound MCP key system.

## Sources

1. [Model Context Protocol — Transports, 2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
2. [Official Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## Follow-on work

A future OAuth 2.1 release can add browser-native consent for hosted private tools. Phase 1 deliberately does not accept MCP keys in a URL or browser storage. Local MCP clients use the NPM package and pass the scoped key as an HTTP authorization header.

## Hosted private-tool authentication decision

Phase 1 publishes the hosted Streamable HTTP endpoint for public tools and the local `alvargo-mcp-server` package for shipper-private tools. This separation is intentional: current Claude custom-connector guidance supports remote MCP connections, while private remote connections require a compatible authorization workflow. Alvargo does not yet operate an OAuth authorization server, and it must not expose bearer MCP keys in a query string or browser storage merely to support hosted private tools.

The next authentication release should implement OAuth 2.1 authorization and consent, allowing users to authenticate through Alvargo and grant only their approved tool scopes to a remote client.

Source: [Anthropic Support — Get started with custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
