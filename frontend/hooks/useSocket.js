import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthToken, getWsBase } from "../lib/api";

const MIN_DELAY = 1000;
const MAX_DELAY = 15000;

/**
 * useTaskFlowSocket(projectId?)
 * - Connects to `${WS_BASE}/ws?token=<access_token>`.
 * - Sends { action: "join", project_id } after open (when projectId given).
 * - Auto-reconnect with capped exponential backoff 1s..15s.
 * - Returns { status: "Live" | "Reconnecting" | "Connecting" | "Closed",
 *             lastEvent, send, reconnect }.
 * - REST remains source of truth; socket only delivers live hints.
 */
export function useTaskFlowSocket(projectId) {
  const [status, setStatus] = useState("Connecting");
  const [lastEvent, setLastEvent] = useState(null);
  const wsRef = useRef(null);
  const attemptRef = useRef(0);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const projectRef = useRef(projectId);
  projectRef.current = projectId;

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const token = getAuthToken();
    const base = getWsBase();
    // If no token yet (e.g. before silent refresh), retry shortly.
    if (!token) {
      setStatus("Reconnecting");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(connect, 1500);
      return;
    }

    try {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
      const ws = new WebSocket(`${base}/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        attemptRef.current = 0;
        setStatus("Live");
        const pid = projectRef.current;
        if (pid) {
          try {
            ws.send(JSON.stringify({ action: "join", project_id: pid }));
          } catch {}
        }
      };

      ws.onmessage = (ev) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(ev.data);
          setLastEvent({ ...data, _receivedAt: Date.now() });
        } catch {
          setLastEvent({ type: "message", raw: ev.data, _receivedAt: Date.now() });
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setStatus("Reconnecting");
        const attempt = attemptRef.current + 1;
        attemptRef.current = attempt;
        const delay = Math.min(MAX_DELAY, MIN_DELAY * 2 ** (attempt - 1));
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    } catch {
      if (!mountedRef.current) return;
      setStatus("Reconnecting");
      const attempt = attemptRef.current + 1;
      attemptRef.current = attempt;
      const delay = Math.min(MAX_DELAY, MIN_DELAY * 2 ** (attempt - 1));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(connect, delay);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Re-send join when project changes on the live socket.
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && projectId) {
      try {
        ws.send(JSON.stringify({ action: "join", project_id: projectId }));
      } catch {}
    }
  }, [projectId]);

  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof msg === "string" ? msg : JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  const reconnect = useCallback(() => {
    attemptRef.current = 0;
    if (timerRef.current) clearTimeout(timerRef.current);
    connect();
  }, [connect]);

  return { status, lastEvent, send, reconnect };
}

export default useTaskFlowSocket;
