type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

const clients: SSEClient[] = [];

export function addSSEClient(id: string, controller: ReadableStreamDefaultController) {
  clients.push({ id, controller });
}

export function removeSSEClient(id: string) {
  const idx = clients.findIndex((c) => c.id === id);
  if (idx !== -1) clients.splice(idx, 1);
}

export function broadcastEvent(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    try {
      client.controller.enqueue(new TextEncoder().encode(payload));
    } catch {
      removeSSEClient(client.id);
    }
  });
}

export function getClientCount(): number {
  return clients.length;
}
