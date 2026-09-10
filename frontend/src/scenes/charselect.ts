import { IN, VIEW_H, VIEW_W, getStage, STAGES } from '@mugen/shared';
import type { App, Scene } from '../core/app.js';
import { centerText, panel, scanlines, text, vgrad } from '../render/ui.js';
import { MainMenu } from './mainmenu.js';
import { VersusScene } from './versus.js';
import { ArcadeScene } from './arcade.js';
import { StoryScene } from './story.js';

type Mode = 'arcade' | 'story' | 'versus' | 'training';
type Phase = 'p1' | 'p2' | 'stage';

const COLS = 5;

export class CharSelect implements Scene {
  private mode: Mode;
  private phase: Phase = 'p1';
  private cursor: [number, number] = [0, 1];
  private picked: [string | null, string | null] = [null, null];
  private opponentCpu = true;
  private stageIdx = -1; // -1 = auto (p1 home stage)
  private t = 0;

  constructor(mode: Mode) {
    this.mode = mode;
  }

  enter(app: App): void {
    app.audio.startMusic({ root: 220, mode: 'phrygian', bpm: 120 });
    app.setHint(
      this.mode === 'versus'
        ? 'P1: WASD+F  P2: Arrows+Num1 · Left/Right on OPPONENT row toggles CPU/P2'
        : 'Move to choose · F/Enter confirm · Esc back',
    );
  }

  private roster(app: App) {
    return app.assets.roster;
  }

  private navigate(app: App, who: 0 | 1): void {
    const n = this.roster(app).length;
    const c = this.cursor[who];
    let nc = c;
    if (app.input.pressedP(who as 0 | 1, IN.LEFT)) nc = (c - 1 + n) % n;
    if (app.input.pressedP(who as 0 | 1, IN.RIGHT)) nc = (c + 1) % n;
    if (app.input.pressedP(who as 0 | 1, IN.UP)) nc = (c - COLS + n) % n;
    if (app.input.pressedP(who as 0 | 1, IN.DOWN)) nc = (c + COLS) % n;
    if (nc !== c) {
      this.cursor[who] = nc;
      app.audio.sfx('menu');
    }
  }

  tick(app: App): void {
    this.t++;
    const roster = this.roster(app);

    if (app.input.anyCancel()) {
      app.audio.sfx('cancel');
      if (this.phase === 'p1') {
        app.audio.stopMusic();
        app.replace(new MainMenu());
      } else if (this.phase === 'p2') {
        this.phase = 'p1';
        this.picked[0] = null;
      } else {
        this.phase = this.mode === 'versus' ? 'p2' : 'p1';
        this.picked[this.mode === 'versus' ? 1 : 0] = null;
      }
      return;
    }

    if (this.phase === 'p1') {
      this.navigate(app, 0);
      if (app.input.pressedP(0, IN.LP) || app.input.anyConfirm()) {
        this.picked[0] = roster[this.cursor[0]].id;
        app.audio.sfx('confirm');
        if (this.mode === 'versus') this.phase = 'p2';
        else {
          this.phase = 'stage';
        }
      }
      // opponent toggle only relevant in versus, shown there
      return;
    }

    if (this.phase === 'p2') {
      // toggle CPU/P2 with P1 left/right when hovering the toggle - simplified: hold S1 to toggle
      if (app.input.pressedP(0, IN.S1) || app.input.pressedP(1, IN.S1)) {
        this.opponentCpu = !this.opponentCpu;
        app.audio.sfx('menu');
      }
      const controller: 0 | 1 = this.opponentCpu ? 0 : 1;
      this.navigate(app, controller);
      this.cursor[1] = this.cursor[controller];
      if (
        app.input.pressedP(controller, IN.LP) ||
        (controller === 0 && app.input.anyConfirm())
      ) {
        this.picked[1] = roster[this.cursor[1]].id;
        app.audio.sfx('confirm');
        this.phase = 'stage';
      }
      return;
    }

    // stage phase
    if (app.input.uiPressed(IN.LEFT)) {
      this.stageIdx = Math.max(-1, this.stageIdx - 1);
      app.audio.sfx('menu');
    }
    if (app.input.uiPressed(IN.RIGHT)) {
      this.stageIdx = Math.min(STAGES.length - 1, this.stageIdx + 1);
      app.audio.sfx('menu');
    }
    if (app.input.anyConfirm()) {
      app.audio.sfx('confirm');
      this.start(app);
    }
  }

  private start(app: App): void {
    app.audio.stopMusic();
    const p1 = this.picked[0]!;
    const homeStage = app.assets.roster.find((r) => r.id === p1)?.stage ?? STAGES[0].id;
    const stageId = this.stageIdx < 0 ? homeStage : STAGES[this.stageIdx].id;

    if (this.mode === 'arcade') {
      app.replace(new ArcadeScene(p1));
      return;
    }
    if (this.mode === 'story') {
      app.replace(new StoryScene(p1));
      return;
    }
    const p2 = this.mode === 'training' ? pickDummy(p1) : this.picked[1]!;
    app.replace(
      new VersusScene({
        p1,
        p2,
        stageId,
        training: this.mode === 'training',
        controllers: [
          { kind: 'local', player: 0 },
          this.mode === 'training'
            ? { kind: 'dummy' }
            : this.opponentCpu
              ? { kind: 'cpu', difficulty: app.settings.difficulty }
              : { kind: 'local', player: 1 },
        ],
        returnTo: () => new CharSelect(this.mode),
      }),
    );
  }

  draw(app: App, ctx: CanvasRenderingContext2D): void {
    const roster = this.roster(app);
    vgrad(ctx, 0, 0, VIEW_W, VIEW_H, '#241a30', '#0a0a10');

    const title =
      this.phase === 'stage'
        ? 'SELECT STAGE'
        : this.mode === 'versus'
          ? this.phase === 'p1'
            ? 'PLAYER 1'
            : this.opponentCpu
              ? 'CPU OPPONENT'
              : 'PLAYER 2'
          : 'SELECT FIGHTER';
    centerText(ctx, title, 18, { size: 14, color: '#ffd23b', weight: 'bold' });

    // grid
    const gx = 96;
    const gy = 34;
    const cw = 58;
    const ch = 50;
    roster.forEach((e, i) => {
      const cx = gx + (i % COLS) * cw;
      const cy = gy + Math.floor(i / COLS) * ch;
      const ca = app.assets.chars.get(e.id);
      panel(ctx, cx, cy, cw - 4, ch - 4, '#12121c', '#33374a');
      if (ca) ctx.drawImage(ca.portrait, 0, 0, 96, 96, cx + 5, cy + 2, 44, 40);
      if (!e.fullyTuned) text(ctx, '·', cx + cw - 12, cy + 12, { size: 12, color: '#8a8fa4' });
      // cursors
      const mark = (who: 0 | 1, color: string): void => {
        if (this.cursor[who] !== i) return;
        if (this.phase === 'p1' && who === 1) return;
        if (this.phase === 'stage') return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx + 1, cy + 1, cw - 6, ch - 6);
      };
      mark(0, '#ff5a5a');
      if (this.mode === 'versus' && this.phase !== 'p1') mark(1, '#5a9aff');
      if (this.picked[0] === e.id) text(ctx, '1P', cx + 4, cy + ch - 8, { size: 8, color: '#ff8a8a' });
      if (this.picked[1] === e.id) text(ctx, '2P', cx + cw - 18, cy + ch - 8, { size: 8, color: '#8abaff' });
    });

    // hovered info
    const who: 0 | 1 = this.phase === 'p2' && !this.opponentCpu ? 1 : 0;
    const hovered = roster[this.cursor[who]];
    panel(ctx, 20, 168, VIEW_W - 40, 54);
    if (hovered) {
      const ca = app.assets.chars.get(hovered.id);
      if (ca) ctx.drawImage(ca.portrait, 24, 172, 46, 46);
      text(ctx, hovered.name.toUpperCase(), 78, 184, { size: 13, color: hovered.accent, weight: 'bold' });
      text(ctx, hovered.archetype, 78, 196, { size: 9, color: '#c8c8d8' });
      text(ctx, `"${hovered.quote}"`, 78, 210, { size: 8, color: '#9aa0b4' });
    }

    if (this.phase === 'p2') {
      centerText(ctx, `S1 / R : opponent = ${this.opponentCpu ? 'CPU' : 'PLAYER 2'}`, 236, {
        size: 9,
        color: '#8a8fa4',
      });
    }
    if (this.phase === 'stage') {
      const homeStage =
        app.assets.roster.find((r) => r.id === this.picked[0])?.stage ?? STAGES[0].id;
      const name = this.stageIdx < 0 ? `AUTO (${getStage(homeStage).name})` : STAGES[this.stageIdx].name;
      centerText(ctx, `◀  ${name}  ▶`, 150, { size: 13, color: '#ffe9a8' });
      const st = app.assets.stage(this.stageIdx < 0 ? homeStage : STAGES[this.stageIdx].id);
      ctx.drawImage(st.sky, 140, 158, 200, 40);
      st.layers.forEach((l) => ctx.drawImage(l, 0, l.height - 40, 200, 40, 140, 158, 200, 40));
      ctx.strokeStyle = '#33374a';
      ctx.strokeRect(140, 158, 200, 40);
      centerText(ctx, 'Enter to fight', 214, { size: 9, color: '#8a8fa4' });
    }
    scanlines(ctx, VIEW_W, VIEW_H, 0.05);
  }
}

function pickDummy(p1: string): string {
  return p1 === 'kaito' ? 'bruno' : 'kaito';
}
