import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import type { Comment } from "@/features/comments/api";

export type PresencePayload = {
  type: "presence";
  name: string;
  color: string;
  typing: boolean;
  cursor?: { from: number; to: number };
};

type CommentAddPayload = {
  type: "comment:add";
  comment: Comment;
};

type CommentUpdatePayload = {
  type: "comment:update";
  comment: Comment;
};

type IncomingPayload = PresencePayload | CommentAddPayload | CommentUpdatePayload;
type SnapshotPayload = {
  type: "snapshot";
  dataB64: string;
};

type UseDocSocketOptions = {
  docId?: string;
  name?: string;
  doc: Y.Doc;
  awareness: Awareness;
  onPresence?: (presence: PresencePayload) => void;
  onCommentAdd?: (comment: Comment) => void;
  onCommentUpdate?: (comment: Comment) => void;
  onError?: (message: string) => void;
};

function isBinaryFrame(data: unknown) {
  return data instanceof ArrayBuffer || data instanceof Blob;
}

function parseIncoming(data: string): IncomingPayload | null {
  try {
    const parsed = JSON.parse(data) as IncomingPayload;
    if (parsed && typeof parsed === "object" && "type" in parsed) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function decodeBase64ToUint8Array(dataB64: string) {
  const binary = atob(dataB64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeUint8ArrayToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useDocSocket({
  docId,
  name,
  doc,
  awareness,
  onPresence,
  onCommentAdd,
  onCommentUpdate,
  onError,
}: UseDocSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const sendQueueRef = useRef<(ArrayBuffer | string)[]>([]);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const disconnectSinceRef = useRef<number | null>(null);
  const notifyTimerRef = useRef<number | null>(null);

  const wsUrl = useMemo(() => {
    const base = import.meta.env.VITE_WS_URL;
    if (!base || !docId || !name) return null;
    const params = new URLSearchParams({ docId, name });
    return `${base}?${params.toString()}`;
  }, [docId, name]);

  const flushQueue = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    while (sendQueueRef.current.length > 0) {
      const payload = sendQueueRef.current.shift();
      if (payload !== undefined) {
        socket.send(payload);
      }
    }
  }, []);

  const send = useCallback(
    (payload: ArrayBuffer | string) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        sendQueueRef.current.push(payload);
        return;
      }
      socket.send(payload);
    },
    []
  );

  const sendPresence = useCallback(
    (payload: Omit<PresencePayload, "type">) => {
      send(JSON.stringify({ type: "presence", ...payload }));
    },
    [send]
  );

  const sendCommentAdd = useCallback(
    (comment: Comment) => {
      send(JSON.stringify({ type: "comment:add", comment }));
    },
    [send]
  );

  const sendCommentUpdate = useCallback(
    (comment: Comment) => {
      send(JSON.stringify({ type: "comment:update", comment }));
    },
    [send]
  );

  const sendSnapshot = useCallback(
    (snapshot: Uint8Array) => {
      const dataB64 = encodeUint8ArrayToBase64(snapshot);
      send(JSON.stringify({ type: "snapshot", dataB64 }));
    },
    [send]
  );

  useEffect(() => {
    if (!wsUrl) return;
    shouldReconnectRef.current = true;

    const connect = () => {
      const socket = new WebSocket(wsUrl);
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        reconnectAttemptsRef.current = 0;
        disconnectSinceRef.current = null;
        if (notifyTimerRef.current) {
          window.clearTimeout(notifyTimerRef.current);
          notifyTimerRef.current = null;
        }
        setIsConnected(true);
        flushQueue();
      });
      socket.addEventListener("close", () => {
        setIsConnected(false);
        if (!disconnectSinceRef.current) {
          disconnectSinceRef.current = Date.now();
        }
        if (notifyTimerRef.current) {
          window.clearTimeout(notifyTimerRef.current);
        }
        notifyTimerRef.current = window.setTimeout(() => {
          if (disconnectSinceRef.current && onError) {
            onError("WebSocket reconnecting…");
          }
        }, 5000);
        if (!shouldReconnectRef.current) return;
        const attempt = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = attempt;
        const delay = Math.min(1000 * 2 ** attempt, 10000);
        if (reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current);
        }
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      });
      socket.addEventListener("error", () => {
        // errors will be handled by close + reconnect cycle
      });
      socket.addEventListener("message", async (event) => {
        if (isBinaryFrame(event.data)) {
          const buffer =
            event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
          Y.applyUpdate(doc, new Uint8Array(buffer), "remote");
          return;
        }

      if (typeof event.data === "string") {
        const payload = parseIncoming(event.data);
        if (payload) {
          if (payload.type === "presence") {
            onPresence?.(payload);
            return;
          }
          if (payload.type === "comment:add") {
            onCommentAdd?.(payload.comment);
            return;
          }
          if (payload.type === "comment:update") {
            onCommentUpdate?.(payload.comment);
            return;
          }
        }

        try {
          const snapshot = JSON.parse(event.data) as SnapshotPayload;
          if (snapshot?.type === "snapshot" && snapshot.dataB64) {
            const update = decodeBase64ToUint8Array(snapshot.dataB64);
            Y.applyUpdate(doc, update, "remote");
          }
        } catch {
          // ignore
        }
        }
      });

      const handleUpdate = (update: Uint8Array, origin: unknown) => {
        if (origin === "remote") return;
        send(update);
      };

      doc.on("update", handleUpdate);

      return () => {
        doc.off("update", handleUpdate);
      };
    };

    const cleanupDoc = connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (notifyTimerRef.current) {
        window.clearTimeout(notifyTimerRef.current);
      }
      cleanupDoc?.();
      socketRef.current?.close();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [doc, wsUrl, flushQueue, onCommentAdd, onCommentUpdate, onError, onPresence, send]);

  useEffect(() => {
    awareness.setLocalState(null);
    return () => {
      awareness.setLocalState(null);
    };
  }, [awareness]);

  return {
    isConnected,
    sendPresence,
    sendCommentAdd,
    sendCommentUpdate,
    sendSnapshot,
  };
}
