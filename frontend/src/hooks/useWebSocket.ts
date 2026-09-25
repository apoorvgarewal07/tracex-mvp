import { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';

export interface WSHopEvent {
  hop_number: number;
  from: string;
  to: string;
  value: string;
  tx_hash: string;
  asset?: string;
  chain?: string;
}

export interface UseWebSocketOptions {
  onHopDiscovered?: (hop: WSHopEvent, progress: number) => void;
  onTraceCompleted?: (data: any) => void;
  onTraceFailed?: (error: string) => void;
}

export const useWebSocket = (traceId?: string | null, options?: UseWebSocketOptions) => {
  const [status, setStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'completed' | 'failed' | 'disconnected'
  >('idle');
  const [hops, setHops] = useState<WSHopEvent[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [latestHop, setLatestHop] = useState<WSHopEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!traceId) {
      setStatus('idle');
      setHops([]);
      setProgress(0);
      setLatestHop(null);
      return;
    }

    const wsUrl = api.getTraceWsUrl(traceId);
    let ws: WebSocket;

    try {
      setStatus('connecting');
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        ws.send(JSON.stringify({ subscribe: traceId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventType = data.event;

          if (eventType === 'HOP_DISCOVERED') {
            const hop = data.hop;
            const prog = data.progress || 50;
            setHops((prev) => [...prev, hop]);
            setLatestHop(hop);
            setProgress(prog);
            optionsRef.current?.onHopDiscovered?.(hop, prog);
          } else if (eventType === 'TRACE_COMPLETED') {
            setStatus('completed');
            setProgress(100);
            optionsRef.current?.onTraceCompleted?.(data);
          } else if (eventType === 'TRACE_FAILED') {
            setStatus('failed');
            optionsRef.current?.onTraceFailed?.(data.error || 'Trace execution failed');
          }
        } catch (e) {
          console.error('[WebSocket] Failed to parse message', e);
        }
      };

      ws.onerror = () => {
        setStatus('disconnected');
      };

      ws.onclose = () => {
        setStatus((prev) => (prev === 'completed' ? 'completed' : 'disconnected'));
      };
    } catch (e) {
      setStatus('failed');
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [traceId]);

  return { status, hops, progress, latestHop };
};
