import { DEFAULT_INPUT_DELAY, IN, PROTOCOL_VERSION, VIEW_H, VIEW_W, STAGES } from '@mugen/shared';
import type { App, Scene } from '../core/app.js';
import { LockstepSession } from '../net/lockstep.js';
import { NetContext } from '../net/context.js';
import { centerText, panel, scanlines, text, vgrad } from '../render/ui.js';
import { MainMenu } from './mainmenu.js';
import { MenuList } from './menu.js';
import { NetVersusScene } from './netversus.js';

type Phase = 'menu' | 'code' | 'connecting' | 'waiting' | 'select' | 'error';
const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export class OnlineLobby implements Scene {
  private phase: Phase = 'menu';
  private menu: MenuList;
  private net = new NetContext();
  private code = '';
  private entry = '';
  private errText = '';
  private intent: 'host' | 'join' = 'host';
  private selCursor = 0;
  private myReady = false;
  private peerReady = false;
  private peerChar = '';
  private started = false;
  private pingT = 0;

  constructor() {
    this.menu = new MenuList([
      { label: 'HOST GAME', onSelect: () => this.host() },
      { label: 'JOIN GAME', onSelect: () => ((this.phase = 'code'), (this.entry = '')) },
      { label: 'BACK', onSelect: () => this.back() },
    ]);
  }

  private app!: App;
  enter(app: App): void {
    this.app = app;
    app.setHint('Online · lockstep netplay');
    this.net.onServer = (m) => this.onServer(m);
    this.net.ws.onClose = (r) => {
      if (this.phase !== 'select' && !this.started) {
        this.errText = r;
        this.phase = 'error';
      }
    };
  }

  exit(): void {
    if (!this.started) this.net.dispose();
  }

  private back(): void {
    this.net.dispose();
    this.app.replace(new MainMenu());
  }

  private ensureConnected(then: () => void): void {
    if (this.net.ws.connected) {
      then();
      return;
    }
    this.phase = 'connecting';
    this.net.ws.onOpen = () => {
      this.net.ws.send({ t: 'hello', version: PROTOCOL_VERSION, name: 'player' });
      then();
    };
    this.net.ws.connect(this.app.settings.serverUrl);
  }

  private host(): void {
    this.intent = 'host';
    this.ensureConnected(() => {
      this.net.ws.send({
        t: 'create',
        roundsToWin: this.app.settings.roundsToWin,
        inputDelay: this.app.settings.inputDelay || DEFAULT_INPUT_DELAY,
      });
      this.phase = 'waiting';
    });
  }

  private join(): void {
    this.intent = 'join';
    this.ensureConnected(() => {
      this.net.ws.send({ t: 'join', code: this.entry });
      this.phase = 'connecting';
    });
  }

  private onServer(m: import('@mugen/shared').ServerMsg): void {
    switch (m.t) {
      case 'created':
        this.code = m.code;
        this.net.slot = m.slot;
        this.net.inputDelay = m.inputDelay;
        this.net.roundsToWin = m.roundsToWin;
        this.phase = 'waiting';
        break;
      case 'joined':
        this.code = m.code;
        this.net.slot = m.slot;
        this.net.inputDelay = m.inputDelay;
        this.net.roundsToWin = m.roundsToWin;
        this.phase = 'select';
        break;
      case 'peer':
        if (m.connected && this.phase === 'waiting') this.phase = 'select';
        this.net.peerName = m.name;
        break;
      case 'select':
        if (m.slot !== this.net.slot) {
          this.peerChar = m.charId;
          this.peerReady = m.ready;
        }
        break;
      case 'start': {
        this.started = true;
        const session = new LockstepSession(this.net.slot, this.net.inputDelay, (msg) =>
          this.net.ws.send(msg),
        );
        this.net.session = session;
        session.begin();
        this.app.replace(
          new NetVersusScene(this.net, {
            p1: m.p1,
            p2: m.p2,
            stageId: m.stage,
            seed: m.seed,
            roundsToWin: this.net.roundsToWin,
          }),
        );
        break;
      }
      case 'peer_left':
        if (!this.started) {
          this.errText = 'opponent left';
          this.phase = 'error';
        }
        break;
      case 'error':
        this.errText = m.message;
        this.phase = 'error';
        break;
    }
  }

  private roster() {
    return this.app.assets.roster;
  }

  tick(app: App): void {
    this.pingT++;
    if (this.pingT % 60 === 0 && this.net.ws.connected) this.net.pingLoop();

    if (this.phase === 'menu') {
      const r = this.menu.tick(app);
      if (r === 'cancel') this.back();
      return;
    }
    if (this.phase === 'error') {
      if (app.input.anyConfirm() || app.input.anyCancel()) this.back();
      return;
    }
    if (this.phase === 'connecting' || this.phase === 'waiting') {
      if (app.input.anyCancel()) this.back();
      return;
    }
    if (this.phase === 'code') {
      for (const ch of ALPHANUM) {
        if (app.input.keyDownEdge(`Key${ch}`) || app.input.keyDownEdge(`Digit${ch}`)) {
          if (this.entry.length < 6) this.entry += ch;
        }
      }
      if (app.input.keyDownEdge('Backspace')) this.entry = this.entry.slice(0, -1);
      if (app.input.keyDownEdge('Enter') && this.entry.length === 6) this.join();
      if (app.input.keyDownEdge('Escape')) this.phase = 'menu';
      return;
    }
    if (this.phase === 'select') {
      const n = this.roster().length;
      if (!this.myReady) {
        if (app.input.uiPressed(IN.LEFT)) this.selCursor = (this.selCursor - 1 + n) % n;
        if (app.input.uiPressed(IN.RIGHT)) this.selCursor = (this.selCursor + 1) % n;
        if (app.input.uiPressed(IN.UP)) this.selCursor = (this.selCursor - 5 + n) % n;
        if (app.input.uiPressed(IN.DOWN)) this.selCursor = (this.selCursor + 5) % n;
      }
      if (app.input.anyConfirm()) {
        this.myReady = !this.myReady;
        const id = this.roster()[this.selCursor].id;
        this.net.ws.send({
          t: 'select',
          charId: id,
          ready: this.myReady,
          stage: STAGES[this.selCursor % STAGES.length].id,
        });
      }
      if (app.input.anyCancel()) this.back();
      return;
    }
  }

  draw(app: App, ctx: CanvasRenderingContext2D): void {
    vgrad(ctx, 0, 0, VIEW_W, VIEW_H, '#101c26', '#08080c');
    centerText(ctx, 'ONLINE', 22, { size: 14, color: '#8affd8', weight: 'bold' });

    if (this.phase === 'menu') {
      this.menu.draw(ctx, VIEW_W / 2 - 60, 90, { gap: 20, width: 120 });
      centerText(ctx, `server: ${app.settings.serverUrl}`, 220, { size: 8, color: '#6a6f84' });
      return;
    }
    if (this.phase === 'code') {
      centerText(ctx, 'ENTER 6-CHAR CODE', 90, { size: 11, color: '#c8c8d8' });
      centerText(ctx, this.entry.padEnd(6, '_').split('').join(' '), 120, {
        size: 22,
        color: '#8affd8',
        weight: 'bold',
      });
      centerText(ctx, 'type letters/numbers · Enter to join · Esc back', 160, {
        size: 8,
        color: '#6a6f84',
      });
      return;
    }
    if (this.phase === 'connecting') {
      centerText(ctx, 'connecting…', VIEW_H / 2, { size: 12, color: '#c8c8d8' });
      return;
    }
    if (this.phase === 'waiting') {
      centerText(ctx, 'YOUR CODE', 84, { size: 10, color: '#c8c8d8' });
      centerText(ctx, this.code.split('').join(' '), 112, {
        size: 26,
        color: '#8affd8',
        weight: 'bold',
      });
      centerText(ctx, 'share it · waiting for opponent…', 150, { size: 9, color: '#8a8fa4' });
      centerText(ctx, 'Esc to cancel', 240, { size: 8, color: '#6a6f84' });
      return;
    }
    if (this.phase === 'error') {
      centerText(ctx, 'CONNECTION PROBLEM', 100, { size: 12, color: '#ff6a6a', weight: 'bold' });
      centerText(ctx, this.errText, 122, { size: 9, color: '#c8c8d8' });
      centerText(ctx, 'is the server running?  npm run dev:server', 140, { size: 8, color: '#6a6f84' });
      centerText(ctx, 'press any key', 200, { size: 8, color: '#6a6f84' });
      return;
    }
    // select
    centerText(ctx, `room ${this.code} · slot ${this.net.slot + 1} · ${Math.round(this.net.rtt)}ms`, 20, {
      size: 8,
      color: '#6a6f84',
    });
    const roster = this.roster();
    const gx = 96;
    const gy = 40;
    roster.forEach((e, i) => {
      const cx = gx + (i % 5) * 58;
      const cy = gy + Math.floor(i / 5) * 50;
      const ca = app.assets.chars.get(e.id);
      panel(ctx, cx, cy, 54, 46, '#12121c', '#33374a');
      if (ca) ctx.drawImage(ca.portrait, 0, 0, 96, 96, cx + 5, cy + 2, 44, 40);
      if (this.selCursor === i) {
        ctx.strokeStyle = this.myReady ? '#5aff9a' : '#8affd8';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx + 1, cy + 1, 52, 44);
      }
      if (this.peerChar === e.id) text(ctx, 'P2', cx + 38, cy + 42, { size: 8, color: '#ffb0b0' });
    });
    centerText(
      ctx,
      `${this.myReady ? 'READY' : 'pick a fighter'} · opponent ${this.peerReady ? 'READY' : '…'}`,
      170,
      { size: 10, color: this.myReady && this.peerReady ? '#5aff9a' : '#c8c8d8' },
    );
    const hov = roster[this.selCursor];
    if (hov) centerText(ctx, `${hov.name.toUpperCase()} — ${hov.archetype}`, 188, { size: 9, color: hov.accent });
    centerText(ctx, 'Enter toggles ready · match starts when both ready', 210, {
      size: 8,
      color: '#6a6f84',
    });
    scanlines(ctx, VIEW_W, VIEW_H, 0.05);
  }
}
