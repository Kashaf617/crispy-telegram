import { NextRequest } from 'next/server';
import { addSSEClient, removeSSEClient } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const clientId = `${Date.now()}-${Math.random()}`;

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(clientId, controller);
      const ping = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(':ping\n\n'));
        } catch {
          clearInterval(ping);
        }
      }, 30000);

      req.signal.addEventListener('abort', () => {
        clearInterval(ping);
        removeSSEClient(clientId);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
