import type { ServerMsg } from '@mugen/shared';
import { LockstepSession } from './lockstep.js';
import { WsClient } from './wsclient.js';

/** Shared across the lobby and the netplay match: one socket, one session. */
export class NetContext {
  ws = new WsClient();
  session: LockstepSession | null = null;
  slot: 0 | 1 = 0;
  peerName = 'opponent';
  inputDelay = 3;
  roundsToWin = 2;
  onServer: ((m: ServerMsg) => void) | null = null;
  lastPongTs = 0;
  rtt = 0;

  constructor() {
    this.ws.onMessage = (m) => this.route(m);
  }

  private route(m: ServerMsg): void {
    if (m.t === 'pong') {
      this.rtt = performance.now() - m.ts;
    }
    if (this.session) {
      if (m.t === 'input') this.session.onRemoteInput(m.frame, m.bits);
      else if (m.t === 'checksum') this.session.onRemoteChecksum(m.frame, m.hash);
      else if (m.t === 'peer_left') this.session.peerLeft = true;
    }
    this.onServer?.(m);
  }

  pingLoop(): void {
    this.ws.send({ t: 'ping', ts: performance.now() });
  }

  dispose(): void {
    this.ws.close();
  }
}
