import type { Handler, HandlerResponse } from '@netlify/functions';
import serverless from 'serverless-http';
import { createAlvargoMcpApp } from '../../server.js';

let handlerPromise: Promise<Handler> | undefined;

/**
 * Creates one warm request-scoped gateway handler per Netlify Function instance.
 * Alvargo-LaaSv1 remains the authoritative backend for all tool operations.
 */
async function getHandler(): Promise<Handler> {
  if (!handlerPromise) {
    handlerPromise = Promise.resolve(serverless(createAlvargoMcpApp()) as unknown as Handler);
  }
  return handlerPromise;
}

export const handler: Handler = async (event, context) => {
  const expressHandler = await getHandler();
  return (await expressHandler(event, context)) as HandlerResponse;
};
