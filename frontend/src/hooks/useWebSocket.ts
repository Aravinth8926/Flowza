import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/auth';

type MessageHandler = (data: any) => void;

export function useWebSocket(onMessage: MessageHandler) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const isUnmounted = useRef(false);
  const { token } = useAuthStore();

  const connect = useCallback(() => {
    if (isUnmounted.current) return;
    const activeToken = token || localStorage.getItem('access_token');
    const apiBase = (
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      'http://localhost:8001'
    ).replace(/\/+$/, '');

    const defaultWsHost = apiBase.replace(/^http(s?):\/\//, (_match: string, s: string) => (s ? 'wss://' : 'ws://'));
    const wsHost = (import.meta.env.VITE_WS_URL || defaultWsHost).replace(/\/+$/, '');
    const wsUrl = `${wsHost}/ws/${activeToken}`;

    try {
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }

      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      let pingInterval: NodeJS.Timeout;

      socket.onopen = () => {
        if (isUnmounted.current) {
          socket.close();
          return;
        }
        console.log('[WebSocket] Real-time connection established.');

        // Keep-alive ping every 30s
        pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send('ping');
          }
        }, 30000);
      };

      socket.onclose = () => {
        clearInterval(pingInterval);
        if (!isUnmounted.current) {
          // Auto-reconnect after 3 seconds
          reconnectTimeout.current = setTimeout(connect, 3000);
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') return;
          onMessage(data);
        } catch (e) {
          console.error('[WebSocket] Error parsing message:', e);
        }
      };

      socket.onerror = (error) => {
        if (!isUnmounted.current) {
          console.warn('[WebSocket] Connection notification:', error);
        }
      };
    } catch (err) {
      if (!isUnmounted.current) {
        console.warn('[WebSocket] Server offline or socket error:', err);
      }
    }
  }, [token, onMessage]);

  useEffect(() => {
    isUnmounted.current = false;
    connect();
    return () => {
      isUnmounted.current = true;
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [connect]);

  return ws;
}
