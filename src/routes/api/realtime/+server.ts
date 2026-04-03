import type { RequestHandler } from './$types.js';

const clients = new Set<ReadableStreamDefaultController>();

function _broadcast(event: any) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch (e) {
      clients.delete(controller);
    }
  });
}

export const GET: RequestHandler = async ({ request, locals }) => {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller as any);
      controller.enqueue(new TextEncoder().encode(': connected\n\n'));
    },
    cancel(controller) {
      clients.delete(controller as any);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
};