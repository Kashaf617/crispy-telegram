'use client';
import { useEffect, useRef } from 'react';

type SSEHandler = (data: unknown) => void;

export function useSSE(handlers: Record<string, SSEHandler>) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/sse');
    esRef.current = es;

    Object.entries(handlers).forEach(([event, handler]) => {
      es.addEventListener(event, (e: MessageEvent) => {
        try { handler(JSON.parse(e.data)); } catch { /* ignore */ }
      });
    });

    return () => { es.close(); esRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
