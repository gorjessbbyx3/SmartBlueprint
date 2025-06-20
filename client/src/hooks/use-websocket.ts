import { useEffect, useRef, useState } from "react";

interface UseWebSocketOptions {
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}${url}`;
    
    const connect = () => {
      try {
        console.log('Attempting WebSocket connection to:', wsUrl);
        ws.current = new WebSocket(wsUrl);
        
        ws.current.onopen = (event) => {
          console.log("WebSocket connected");
          setIsConnected(true);
          options.onOpen?.(event);
        };
        
        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);
          } catch (error) {
            setLastMessage({ type: 'raw', data: event.data });
          }
          options.onMessage?.(event);
        };
        
        ws.current.onclose = (event) => {
          console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);
          setIsConnected(false);
          options.onClose?.(event);
          
          // Only attempt to reconnect for unexpected closures
          if (!event.wasClean && event.code !== 1000) {
            console.log("Attempting to reconnect WebSocket...");
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, 3000);
          }
        };
        
        ws.current.onerror = (event) => {
          console.error("WebSocket error:", event);
          setIsConnected(false);
          options.onError?.(event);
          console.warn("WebSocket connection failed - app will work without real-time updates");
        };
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, [url]);

  const sendMessage = (message: string | object) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === "string" ? message : JSON.stringify(message);
      ws.current.send(messageStr);
    } else {
      console.warn("WebSocket is not connected");
    }
  };

  return {
    sendMessage,
    isConnected,
    lastMessage,
  };
}
