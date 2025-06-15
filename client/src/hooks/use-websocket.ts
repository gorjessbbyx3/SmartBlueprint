import { useEffect, useRef } from "react";

interface UseWebSocketOptions {
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}${url}`;
    
    const connect = () => {
      try {
        ws.current = new WebSocket(wsUrl);
        
        ws.current.onopen = (event) => {
          console.log("WebSocket connected");
          options.onOpen?.(event);
        };
        
        ws.current.onmessage = (event) => {
          options.onMessage?.(event);
        };
        
        ws.current.onclose = (event) => {
          console.log("WebSocket disconnected");
          options.onClose?.(event);
          
          // Attempt to reconnect after 5 seconds
          if (!event.wasClean) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log("Attempting to reconnect WebSocket...");
              connect();
            }, 5000);
          }
        };
        
        ws.current.onerror = (event) => {
          console.error("WebSocket error:", event);
          options.onError?.(event);
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
    isConnected: ws.current?.readyState === WebSocket.OPEN,
  };
}
