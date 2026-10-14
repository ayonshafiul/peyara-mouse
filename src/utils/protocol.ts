// Native WebSocket protocol (desktop server peyara-egui v2.0.0, protocol v2).
// The server speaks plain WebSockets at GET /ws. Every frame is a UTF-8 JSON
// text message with a `type` discriminator. There are no acks, namespaces
// or rooms — sends are fire-and-forget.

export interface WsServerMessage {
  type: string;
  text?: string;
  [key: string]: unknown;
}

// Safely parses an incoming socket frame. Returns null for binary frames,
// invalid JSON, or messages without a string `type` (the server ignores
// those too, so we just drop them).
export function parseServerMessage(data: unknown): WsServerMessage | null {
  if (typeof data !== 'string') {
    return null;
  }
  try {
    const msg = JSON.parse(data);
    if (!msg || typeof msg.type !== 'string') {
      return null;
    }
    return msg as WsServerMessage;
  } catch {
    return null;
  }
}
