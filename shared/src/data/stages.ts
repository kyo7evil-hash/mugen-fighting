export interface StageLayer {
  /** relative parallax speed 0 (locked to bg) .. 1 (locked to world). */
  parallax: number;
  colors: string[];
  kind: 'sky' | 'far' | 'mid' | 'near' | 'floor';
}

export interface StageDef {
  id: string;
  name: string;
  skyTop: string;
  skyBottom: string;
  floorColor: string;
  floorLine: string;
  accent: string;
  layers: StageLayer[];
  music: { root: number; mode: 'minor' | 'major' | 'phrygian'; bpm: number };
}

export const STAGES: StageDef[] = [
  {
    id: 'dojo',
    name: 'Ronin Dojo',
    skyTop: '#2a2f45',
    skyBottom: '#5a4a52',
    floorColor: '#6a5238',
    floorLine: '#3c2c1c',
    accent: '#b03636',
    layers: [
      { kind: 'far', parallax: 0.15, colors: ['#3a3f58', '#2f3348'] },
      { kind: 'mid', parallax: 0.4, colors: ['#7a5a44', '#5c4230'] },
      { kind: 'near', parallax: 0.7, colors: ['#8a6a4a'] },
    ],
    music: { root: 220, mode: 'minor', bpm: 92 },
  },
  {
    id: 'timberyard',
    name: 'Timberyard',
    skyTop: '#3a4a5a',
    skyBottom: '#8a7a5a',
    floorColor: '#5a4a2a',
    floorLine: '#33260f',
    accent: '#c9a24b',
    layers: [
      { kind: 'far', parallax: 0.12, colors: ['#4a5a4a', '#3a4a3a'] },
      { kind: 'mid', parallax: 0.38, colors: ['#6a5238', '#4c3a24'] },
      { kind: 'near', parallax: 0.72, colors: ['#7a6242'] },
    ],
    music: { root: 196, mode: 'minor', bpm: 100 },
  },
  {
    id: 'ridge',
    name: 'Windward Ridge',
    skyTop: '#1e3a55',
    skyBottom: '#9ad0e0',
    floorColor: '#7a8a6a',
    floorLine: '#455037',
    accent: '#9adcff',
    layers: [
      { kind: 'far', parallax: 0.1, colors: ['#2f5570', '#274860'] },
      { kind: 'mid', parallax: 0.34, colors: ['#4a7a8a', '#3a5f6c'] },
      { kind: 'near', parallax: 0.66, colors: ['#6a8a7a'] },
    ],
    music: { root: 262, mode: 'major', bpm: 108 },
  },
  {
    id: 'overpass',
    name: 'Neon Overpass',
    skyTop: '#140a22',
    skyBottom: '#3a1a4a',
    floorColor: '#2a2a34',
    floorLine: '#14141c',
    accent: '#ff3b6a',
    layers: [
      { kind: 'far', parallax: 0.14, colors: ['#22163a', '#1a1030'] },
      { kind: 'mid', parallax: 0.42, colors: ['#3a2450', '#2a1a3c'] },
      { kind: 'near', parallax: 0.75, colors: ['#4a2a5a'] },
    ],
    music: { root: 233, mode: 'phrygian', bpm: 132 },
  },
  {
    id: 'harbor',
    name: 'Iron Harbor',
    skyTop: '#3a4450',
    skyBottom: '#7a8894',
    floorColor: '#4a4e54',
    floorLine: '#282c31',
    accent: '#e2b33b',
    layers: [
      { kind: 'far', parallax: 0.12, colors: ['#42505c', '#354049'] },
      { kind: 'mid', parallax: 0.4, colors: ['#54606a', '#414b53'] },
      { kind: 'near', parallax: 0.7, colors: ['#64707a'] },
    ],
    music: { root: 175, mode: 'minor', bpm: 96 },
  },
  {
    id: 'rooftops',
    name: 'Temple Rooftops',
    skyTop: '#4a2a5a',
    skyBottom: '#e08a6a',
    floorColor: '#5a3a4a',
    floorLine: '#2f1e28',
    accent: '#ff9edb',
    layers: [
      { kind: 'far', parallax: 0.1, colors: ['#5a3a6a', '#472f55'] },
      { kind: 'mid', parallax: 0.36, colors: ['#7a4a5a', '#5f3a48'] },
      { kind: 'near', parallax: 0.68, colors: ['#8a5a6a'] },
    ],
    music: { root: 294, mode: 'major', bpm: 116 },
  },
  {
    id: 'courtyard',
    name: 'Stone Courtyard',
    skyTop: '#2f3a3a',
    skyBottom: '#8a9a8a',
    floorColor: '#6a6a5a',
    floorLine: '#3c3c31',
    accent: '#e8e2c0',
    layers: [
      { kind: 'far', parallax: 0.13, colors: ['#3f4f4a', '#33413c'] },
      { kind: 'mid', parallax: 0.39, colors: ['#5a6a5a', '#47554a'] },
      { kind: 'near', parallax: 0.7, colors: ['#6a7a6a'] },
    ],
    music: { root: 208, mode: 'minor', bpm: 88 },
  },
  {
    id: 'gallery',
    name: 'Shadow Gallery',
    skyTop: '#12101a',
    skyBottom: '#2a2438',
    floorColor: '#22202c',
    floorLine: '#100e16',
    accent: '#8affd8',
    layers: [
      { kind: 'far', parallax: 0.12, colors: ['#1e1a2c', '#161222'] },
      { kind: 'mid', parallax: 0.4, colors: ['#2c2640', '#221d33'] },
      { kind: 'near', parallax: 0.74, colors: ['#362e4c'] },
    ],
    music: { root: 246, mode: 'phrygian', bpm: 104 },
  },
  {
    id: 'hall',
    name: 'Duelist Hall',
    skyTop: '#2a2430',
    skyBottom: '#6a5a5a',
    floorColor: '#4a3f42',
    floorLine: '#282023',
    accent: '#d8d8e0',
    layers: [
      { kind: 'far', parallax: 0.12, colors: ['#332b38', '#28222e'] },
      { kind: 'mid', parallax: 0.38, colors: ['#4a3f48', '#3a323c'] },
      { kind: 'near', parallax: 0.7, colors: ['#5a4f56'] },
    ],
    music: { root: 220, mode: 'minor', bpm: 100 },
  },
  {
    id: 'colossus',
    name: 'Fallen Colossus',
    skyTop: '#3a1e14',
    skyBottom: '#c25a2a',
    floorColor: '#5a3a2a',
    floorLine: '#2f1c12',
    accent: '#ff6a3b',
    layers: [
      { kind: 'far', parallax: 0.1, colors: ['#5a2f22', '#47251b'] },
      { kind: 'mid', parallax: 0.35, colors: ['#7a4432', '#5f3527'] },
      { kind: 'near', parallax: 0.66, colors: ['#8a5442'] },
    ],
    music: { root: 165, mode: 'phrygian', bpm: 84 },
  },
];

export function getStage(id: string): StageDef {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}
