import { BOSS_ID, VIEW_H, VIEW_W, getCharacter, getStage } from '@mugen/shared';
import type { App, Scene } from '../core/app.js';
import { centerText, panel, scanlines, text, vgrad } from '../render/ui.js';
import { MainMenu } from './mainmenu.js';
import { VersusScene } from './versus.js';

const ENDINGS: Record<string, string[]> = {
  kaito: ['The colossus falls silent.', 'Kaito sheathes a sword he never drew,', 'and walks back into the rain.'],
  bruno: ['Bruno lifts the beaten giant overhead', 'and sets it down, gently, like timber.', '"Good match," he says. Nobody argues.'],
  vesper: ['From the ridge, Vesper watches the dust settle.', 'She never had to move from her mark.', 'The wind picks up. She is already gone.'],
  rieko: ['Rieko crosses the line first, as always.', 'The engine ticks as it cools.', 'She is already looking for the next race.'],
  grigor: ['The wait is over. Grigor unclenches his fists.', 'Nine ports, and now a tenth trophy.', 'He never threw the first punch. He never has to.'],
  anira: ['Anira lands without a sound on the highest tile.', 'Below, the arena looks very small.', 'She looks up instead.'],
  tomas: ['Water and stone, at last, agree.', 'Tomas bows to an opponent who fought them both.', '"Now you know which of me won."'],
  nadia: ['Two shadows walk away where one arrived.', 'The debt is paid, for another year.', 'Nadia does not look at the thing beside her.'],
  sable: ['Sable steps back over the fallen guard.', 'The half-second after your mistake', 'was always long enough.'],
  goliath: ['Goliath stands alone in the ring, as intended.', 'The distance was never yours to set.', 'It never will be.'],
};

export class ArcadeScene implements Scene {
  private playerId: string;
  private ladder: string[] = [];
  private index = 0;
  private continues = 3;
  private phase: 'card' | 'ending' | 'gameover' = 'card';
  private cardT = 0;
  private started = false;

  constructor(playerId: string) {
    this.playerId = playerId;
  }

  enter(app: App): void {
    if (!this.started) {
      this.started = true;
      const pool = app.assets.roster
        .map((r) => r.id)
        .filter((id) => id !== this.playerId && id !== BOSS_ID);
      shuffle(pool, hash(this.playerId));
      const boss = this.playerId === BOSS_ID ? 'sable' : BOSS_ID;
      this.ladder = [...pool.slice(0, 6), boss];
    }
    if (this.phase === 'card') this.cardT = 0;
    app.audio.startMusic({ root: 233, mode: 'phrygian', bpm: 128 });
    app.setHint(this.phase === 'card' ? 'Enter to fight · Esc to quit' : 'Enter to continue');
  }

  exit(app: App): void {
    app.audio.stopMusic();
  }

  tick(app: App): void {
    if (this.phase === 'card') {
      this.cardT++;
      if (app.input.pauseEdge()) {
        app.audio.stopMusic();
        app.replace(new MainMenu());
        return;
      }
      if (this.cardT > 100 || app.input.anyConfirm()) this.launch(app);
      return;
    }
    // ending / gameover
    if (app.input.anyConfirm() || app.input.anyCancel()) {
      app.audio.stopMusic();
      app.replace(new MainMenu());
    }
  }

  private launch(app: App): void {
    const opp = this.ladder[this.index];
    const isBoss = this.index === this.ladder.length - 1;
    const base = app.settings.difficulty;
    const diff = Math.max(0, Math.min(2, base + (isBoss ? 1 : this.index >= 3 ? 1 : 0))) as 0 | 1 | 2;
    app.audio.stopMusic();
    app.replace(
      new VersusScene({
        p1: this.playerId,
        p2: opp,
        stageId: getCharacter(opp).stage,
        controllers: [
          { kind: 'local', player: 0 },
          { kind: 'cpu', difficulty: diff },
        ],
        roundsToWin: app.settings.roundsToWin,
        title: isBoss ? 'ARCADE · FINAL' : `ARCADE · ${this.index + 1} / ${this.ladder.length}`,
        returnTo: () => new MainMenu(),
        onResult: (w) => this.result(app, w),
      }),
    );
  }

  private result(app: App, winner: 0 | 1): void {
    if (winner === 0) {
      this.index++;
      if (this.index >= this.ladder.length) this.phase = 'ending';
      else this.phase = 'card';
    } else {
      this.continues--;
      if (this.continues < 0) this.phase = 'gameover';
      else this.phase = 'card';
    }
    app.replace(this);
  }

  draw(app: App, ctx: CanvasRenderingContext2D): void {
    vgrad(ctx, 0, 0, VIEW_W, VIEW_H, '#2a1420', '#08080c');

    if (this.phase === 'card') {
      const opp = this.ladder[this.index];
      const e = app.assets.roster.find((r) => r.id === opp)!;
      const ca = app.assets.chars.get(opp)!;
      const you = app.assets.chars.get(this.playerId)!;
      centerText(ctx, this.index === this.ladder.length - 1 ? 'FINAL OPPONENT' : `OPPONENT ${this.index + 1} / ${this.ladder.length}`, 30, {
        size: 11,
        color: '#ffd23b',
        weight: 'bold',
      });
      ctx.drawImage(you.portrait, 60, 70, 80, 80);
      ctx.drawImage(ca.portrait, 340, 70, 80, 80);
      centerText(ctx, 'VS', 118, { size: 22, color: '#ff5a5a', weight: 'bold' });
      centerText(ctx, e.name.toUpperCase(), 172, { size: 16, color: e.accent, weight: 'bold' });
      centerText(ctx, e.archetype, 186, { size: 9, color: '#c8c8d8' });
      centerText(ctx, `"${e.quote}"`, 202, { size: 9, color: '#9aa0b4' });
      centerText(ctx, `continues left: ${this.continues}`, 226, { size: 9, color: '#8a8fa4' });
      centerText(ctx, getStage(getCharacter(opp).stage).name, 240, { size: 8, color: '#6a6f84' });
    } else if (this.phase === 'ending') {
      const ca = app.assets.chars.get(this.playerId)!;
      ctx.drawImage(ca.portrait, VIEW_W / 2 - 40, 40, 80, 80);
      centerText(ctx, `${getCharacter(this.playerId).name.toUpperCase()} — ARCADE CLEAR`, 140, {
        size: 14,
        color: '#ffd23b',
        weight: 'bold',
      });
      const lines = ENDINGS[this.playerId] ?? ['The tournament is won.'];
      lines.forEach((l, i) => centerText(ctx, l, 162 + i * 14, { size: 10, color: '#d8d8e6' }));
      centerText(ctx, 'thank you for playing', 232, { size: 9, color: '#8a8fa4' });
    } else {
      centerText(ctx, 'GAME OVER', 120, { size: 26, color: '#ff5a5a', weight: 'bold' });
      centerText(ctx, `you reached opponent ${this.index + 1}`, 150, { size: 10, color: '#c8c8d8' });
    }
    panel(ctx, 0, 0, 0, 0);
    scanlines(ctx, VIEW_W, VIEW_H, 0.05);
  }
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function shuffle<T>(arr: T[], seed: number): void {
  let s = seed >>> 0;
  const rnd = (): number => {
    s = (Math.imul(s ^ (s >>> 15), s | 1) + 0x6d2b79f5) >>> 0;
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
