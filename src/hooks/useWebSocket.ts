import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/auth';

type MessageHandler = (data: any) => void;

export function useWebSocket(onMessage: MessageHandler) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const { token } = useAuthStore();

  const connect = useCallback(() => {
    const activeToken = token || localStorage.getItem('access_token');
    if (!activeToken) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const wsUrl = `${wsHost}/ws/${activeToken}`;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('[WebSocket] Real-time connection established.');

        // Keep-alive ping every 30s
        const pingInterval = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send('ping');
          }
        }, 30000);

        if (ws.current) {
          ws.current.onclose = () => {
            clearInterval(pingInterval);
            // Auto-reconnect after 3 seconds
            reconnectTimeout.current = setTimeout(connect, 3000);
          };
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') return;
          onMessage(data);
        } catch (e) {
          console.error('[WebSocket] Error parsing message:', e);
        }
      };

      ws.current.onerror = (error) => {
        console.warn('[WebSocket] Connection error:', error);
      };
    } catch (err) {
      console.warn('[WebSocket] Server offline or socket error:', err);
    }
  }, [token, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      ws.current?.close();
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [connect]);

  return ws;
}
