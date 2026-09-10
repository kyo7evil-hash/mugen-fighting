import { CHECKSUM_INTERVAL, type ClientMsg } from '@mugen/shared';

/**
 * Delay-based lockstep. Frame F is simulated using inputs decided `delay`
 * visual frames earlier, so both peers only ever step a frame once both
 * inputs for it are in hand. No rollback.
 */
export class LockstepSession {
  readonly slot: 0 | 1;
  readonly delay: number;
  simFrame = 0;
  started = false;
  desyncFrame = -1;
  peerLeft = false;
  stalls = 0;
  ping = 0;

  private local = new Map<number, number>();
  private remote = new Map<number, number>();
  private myChecksums = new Map<number, number>();
  private send: (m: ClientMsg) => void;

  constructor(slot: 0 | 1, delay: number, send: (m: ClientMsg) => void) {
    this.slot = slot;
    this.delay = Math.max(1, delay);
    this.send = send;
  }

  begin(): void {
    for (let i = 0; i < this.delay; i++) {
      this.local.set(i, 0);
      this.remote.set(i, 0);
    }
    this.started = true;
    this.simFrame = 0;
  }

  onRemoteInput(frame: number, bits: number): void {
    this.remote.set(frame, bits);
  }

  onRemoteChecksum(frame: number, hash: number): void {
    const mine = this.myChecksums.get(frame);
    if (mine !== undefined && mine !== hash && this.desyncFrame < 0) {
      this.desyncFrame = frame;
      this.send({ t: 'checksum', frame, hash: mine >>> 0 });
    }
  }

  recordChecksum(frame: number, hash: number): void {
    this.myChecksums.set(frame, hash >>> 0);
    this.send({ t: 'checksum', frame, hash: hash >>> 0 });
    // prune
    for (const k of this.myChecksums.keys()) if (k < frame - 300) this.myChecksums.delete(k);
  }

  /**
   * Schedule the local input for (simFrame + delay), then return the input
   * pair for simFrame if both sides are known, else null (stall).
   */
  frameInputs(localBits: number): [number, number] | null {
    if (!this.started || this.peerLeft || this.desyncFrame >= 0) return null;
    const sched = this.simFrame + this.delay;
    if (!this.local.has(sched)) {
      this.local.set(sched, localBits);
      this.send({ t: 'input', frame: sched, bits: localBits });
    }
    const li = this.local.get(this.simFrame);
    const ri = this.remote.get(this.simFrame);
    if (li === undefined || ri === undefined) {
      this.stalls++;
      return null;
    }
    return this.slot === 0 ? [li, ri] : [ri, li];
  }

  /** Call right after a successful frameInputs() (before/after stepping is fine, be consistent: call BEFORE step with pre-step state checksum). */
  afterConsumed(preStepChecksum: number): void {
    if (this.simFrame % CHECKSUM_INTERVAL === 0) this.recordChecksum(this.simFrame, preStepChecksum);
    // trim old input entries
    if (this.simFrame % 120 === 0) {
      for (const k of this.local.keys()) if (k < this.simFrame - 240) this.local.delete(k);
      for (const k of this.remote.keys()) if (k < this.simFrame - 240) this.remote.delete(k);
    }
    this.simFrame++;
  }
}
