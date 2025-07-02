"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [nickname, setNickname] = useState(null);

  useEffect(() => {
    const stompClient = new Client({
      brokerURL: process.env.NEXT_PUBLIC_WS_URL,
      debug: function (str) {
        if (str.includes('heart-beat') || str.includes('CONNECT') || str.includes('DISCONNECT')) {
          console.log('[WebSocket]', str);
        }
      },
      reconnectDelay: 5000,
      maxReconnectAttempts: 10,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log("[WebSocket] 연결 성공");
        setConnected(true);
      },
      onDisconnect: () => {
        console.log("[WebSocket] 연결 끊김");
        setConnected(false);
      },
      onStompError: (frame) => {
        console.error("[WebSocket] STOMP 에러:", frame.headers["message"]);
        console.error("[WebSocket] 에러 상세:", frame.body);
      },
      onWebSocketError: (event) => {
        console.error("[WebSocket] 연결 에러:", event);
      },
      connectHeaders: {
        "heart-beat": "10000,10000" // 10초
      },
    });

    try {
      stompClient.activate();
      setClient(stompClient);
    } catch (error) {
      console.error("[WebSocket] STOMP 클라이언트 활성화 실패:", error);
    }

    return () => {
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{ client, connected, nickname, setNickname }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket은 WebSocketProvider 내에서 사용되어야 합니다");
  }
  return context;
}
