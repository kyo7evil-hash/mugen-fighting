export interface ClipMeta {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
}

export interface SpriteAtlas {
  id: string;
  name: string;
  cell: number;
  originX: number;
  groundY: number;
  clips: Record<string, ClipMeta>;
}

export interface CharAssets {
  atlas: SpriteAtlas;
  sheet: HTMLImageElement;
  portrait: HTMLImageElement;
}

export interface StageMeta {
  id: string;
  name: string;
  layerW: number;
  layerH: number;
  floorW: number;
  floorH: number;
  parallax: number[];
  accent: string;
  music: { root: number; mode: string; bpm: number };
}

export interface StageAssets {
  meta: StageMeta;
  sky: HTMLImageElement;
  layers: HTMLImageElement[];
  floor: HTMLImageElement;
}

export interface RosterEntry {
  id: string;
  name: string;
  archetype: string;
  quote: string;
  bio: string;
  stage: string;
  accent: string;
  primary: string;
  fullyTuned: boolean;
}

const BASE = 'assets';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(`failed to load ${url}`));
    img.src = url;
  });
}

async function loadJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`failed to load ${url}`);
  return (await r.json()) as T;
}

export class Assets {
  chars = new Map<string, CharAssets>();
  stages = new Map<string, StageAssets>();
  roster: RosterEntry[] = [];
  clipNames: string[] = [];

  async load(onProgress?: (p: number, label: string) => void): Promise<void> {
    const rosterFile = await loadJSON<{ clipNames: string[]; characters: RosterEntry[] }>(
      `${BASE}/roster.json`,
    );
    this.roster = rosterFile.characters;
    this.clipNames = rosterFile.clipNames;
    const stageIndex = await loadJSON<{ id: string; name: string }[]>(`${BASE}/stages/index.json`);

    const total = this.roster.length + stageIndex.length;
    let done = 0;
    const tick = (label: string): void => {
      done++;
      onProgress?.(done / total, label);
    };

    for (const entry of this.roster) {
      const dir = `${BASE}/characters/${entry.id}`;
      const [atlas, sheet, portrait] = await Promise.all([
        loadJSON<SpriteAtlas>(`${dir}/atlas.json`),
        loadImage(`${dir}/sheet.png`),
        loadImage(`${dir}/portrait.png`),
      ]);
      this.chars.set(entry.id, { atlas, sheet, portrait });
      tick(entry.name);
    }

    for (const s of stageIndex) {
      const dir = `${BASE}/stages/${s.id}`;
      const meta = await loadJSON<StageMeta>(`${dir}/stage.json`);
      const [sky, floor, ...layers] = await Promise.all([
        loadImage(`${dir}/sky.png`),
        loadImage(`${dir}/floor.png`),
        ...meta.parallax.map((_, i) => loadImage(`${dir}/layer${i}.png`)),
      ]);
      this.stages.set(s.id, { meta, sky, floor, layers });
      tick(meta.name);
    }
  }

  char(id: string): CharAssets {
    const c = this.chars.get(id);
    if (!c) throw new Error(`no assets for character ${id}`);
    return c;
  }

  stage(id: string): StageAssets {
    return this.stages.get(id) ?? [...this.stages.values()][0];
  }
}
