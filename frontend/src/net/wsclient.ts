import type { ClientMsg, ServerMsg } from '@mugen/shared';

export class WsClient {
  private ws: WebSocket | null = null;
  private queue: ClientMsg[] = [];
  onMessage: ((m: ServerMsg) => void) | null = null;
  onOpen: (() => void) | null = null;
  onClose: ((reason: string) => void) | null = null;
  connected = false;

  connect(url: string): void {
    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      this.onClose?.(`bad url: ${String(e)}`);
      return;
    }
    this.ws.onopen = () => {
      this.connected = true;
      for (const m of this.queue) this.ws!.send(JSON.stringify(m));
      this.queue.length = 0;
      this.onOpen?.();
    };
    this.ws.onmessage = (ev) => {
      try {
        this.onMessage?.(JSON.parse(ev.data as string) as ServerMsg);
      } catch {
        /* ignore malformed */
      }
    };
    this.ws.onclose = () => {
      this.connected = false;
      this.onClose?.('connection closed');
    };
    this.ws.onerror = () => {
      this.onClose?.('connection error');
    };
  }

  send(m: ClientMsg): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
    else this.queue.push(m);
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
