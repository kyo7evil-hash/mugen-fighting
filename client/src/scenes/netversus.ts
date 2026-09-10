import { VIEW_H, VIEW_W, checksum } from '@mugen/shared';
import type { App, Scene } from '../core/app.js';
import type { NetContext } from '../net/context.js';
import { LockstepSession } from '../net/lockstep.js';
import { MatchRunner } from '../game/match.js';
import { centerText, panel, text } from '../render/ui.js';
import { MainMenu } from './mainmenu.js';

interface NetOpts {
  p1: string;
  p2: string;
  stageId: string;
  seed: number;
  roundsToWin: number;
}

export class NetVersusScene implements Scene {
  private net: NetContext;
  private opts: NetOpts;
  private runner!: MatchRunner;
  private app!: App;
  private stalled = false;
  private stallFrames = 0;
  private wantRematch = false;
  private endMsg = '';

  constructor(net: NetContext, opts: NetOpts) {
    this.net = net;
    this.opts = opts;
  }

  enter(app: App): void {
    this.app = app;
    this.buildRunner(app, this.opts.seed);
    app.audio.startMusic(app.assets.stage(this.opts.stageId).meta.music);
    app.setHint('Online match · lockstep');
    this.net.onServer = (m) => {
      if (m.t === 'rematch') {
        this.net.session = new LockstepSession(this.net.slot, this.net.inputDelay, (msg) =>
          this.net.ws.send(msg),
        );
        this.net.session.begin();
        this.wantRematch = false;
        this.endMsg = '';
        this.buildRunner(app, m.seed);
      } else if (m.t === 'peer_left') {
        this.endMsg = 'opponent disconnected';
      }
    };
  }

  exit(app: App): void {
    app.audio.stopMusic();
    this.net.dispose();
  }

  private buildRunner(app: App, seed: number): void {
    this.runner = new MatchRunner(app, {
      p1: this.opts.p1,
      p2: this.opts.p2,
      stageId: this.opts.stageId,
      seed,
      roundsToWin: this.opts.roundsToWin,
      controllers: [
        { kind: 'local', player: 0 },
        { kind: 'local', player: 0 },
      ],
    });
    this.runner.provideInputs = () => {
      const session = this.net.session;
      if (!session || session.peerLeft || session.desyncFrame >= 0) {
        this.stalled = true;
        return null;
      }
      const local = this.app.input.player(0);
      const inp = session.frameInputs(local);
      if (inp) {
        session.afterConsumed(checksum(this.runner.state));
        this.stalled = false;
      } else {
        this.stalled = true;
      }
      return inp;
    };
  }

  tick(app: App): void {
    this.runner.tick(app);
    this.stallFrames = this.stalled ? this.stallFrames + 1 : 0;

    const session = this.net.session;
    if (session?.desyncFrame && session.desyncFrame >= 0 && !this.endMsg) {
      this.endMsg = `desync at frame ${session.desyncFrame}`;
    }
    if (session?.peerLeft && !this.endMsg) this.endMsg = 'opponent disconnected';

    if (this.endMsg) {
      if (app.input.anyConfirm() || app.input.anyCancel()) {
        app.replace(new MainMenu());
      }
      return;
    }

    if (this.runner.over) {
      if (!this.wantRematch && app.input.anyConfirm()) {
        this.wantRematch = true;
        this.net.ws.send({ t: 'rematch' });
      }
      if (app.input.anyCancel()) app.replace(new MainMenu());
    }
  }

  draw(app: App, ctx: CanvasRenderingContext2D): void {
    this.runner.draw(app, ctx);

    if (this.stallFrames > 6 && !this.endMsg) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, VIEW_H / 2 - 12, VIEW_W, 24);
      centerText(ctx, 'waiting for opponent…', VIEW_H / 2 + 3, { size: 11, color: '#ffd23b' });
    }

    if (this.runner.over && !this.endMsg) {
      panel(ctx, VIEW_W / 2 - 80, 190, 160, 40);
      centerText(ctx, this.wantRematch ? 'waiting for rematch…' : 'ENTER: rematch', 208, {
        size: 10,
        color: '#c8c8d8',
      });
      centerText(ctx, 'ESC: leave', 222, { size: 8, color: '#8a8fa4' });
    }

    if (this.endMsg) {
      ctx.fillStyle = 'rgba(4,6,12,0.8)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      centerText(ctx, this.endMsg.toUpperCase(), VIEW_H / 2 - 6, {
        size: 13,
        color: '#ff6a6a',
        weight: 'bold',
      });
      centerText(ctx, 'press any key', VIEW_H / 2 + 12, { size: 9, color: '#9aa0b4' });
    }

    const s = this.net.session;
    if (s) text(ctx, `d${s.delay} f${s.simFrame} ${Math.round(this.net.rtt)}ms`, 4, VIEW_H - 4, { size: 7, color: '#55596a' });
  }
}
