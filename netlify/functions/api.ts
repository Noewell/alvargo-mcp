import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import serverless from 'serverless-http';
import { createAlvargoMcpApp, handleMcpWebRequest } from '../../server.js';

let handlerPromise: Promise<Handler> | undefined;

/**
 * Creates one warm Express handler per Netlify Function instance for the
 * landing page and non-MCP API routes. Streamable HTTP is dispatched directly
 * below because Netlify's Express shim does not preserve request headers for
 * the MCP SDK's Node adapter.
 */
async function getHandler(): Promise<Handler> {
  if (!handlerPromise) {
    handlerPromise = Promise.resolve(serverless(createAlvargoMcpApp()) as unknown as Handler);
  }
  return handlerPromise;
}

function isMcpTransportRequest(event: HandlerEvent): boolean {
  try {
    return new URL(event.rawUrl).pathname === '/api/mcp';
  } catch {
    return event.path === '/api/mcp';
  }
}

function toWebRequest(event: HandlerEvent): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(event.headers)) {
    if (typeof value === 'string') headers.set(name, value);
  }
  const body = event.body
    ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body)
    : undefined;
  return new Request(event.rawUrl, {
    method: event.httpMethod,
    headers,
    body: ['GET', 'HEAD'].includes(event.httpMethod) ? undefined : body,
  });
}

async function fromWebResponse(response: Response): Promise<HandlerResponse> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => { headers[name] = value; });
  return {
    statusCode: response.status,
    headers,
    body: await response.text(),
  };
}

export const handler: Handler = async (event, context) => {
  if (isMcpTransportRequest(event)) {
    return fromWebResponse(await handleMcpWebRequest(toWebRequest(event)));
  }
  const expressHandler = await getHandler();
  return (await expressHandler(event, context)) as HandlerResponse;
};
