# MUGEN Fighting

A MUGEN-style 2D fighting game for the browser. TypeScript + HTML5 Canvas, no
framework. Ten fighters with distinct styles, Arcade, Story, local Versus,
Training, and **online lockstep netplay**.

```
npm install
npm run dev        # generates assets, starts client (5173) + netplay server (8080)
```

Open http://localhost:5173. For online, open it in two tabs/machines: one **HOST**s
(gets a 6-char code), the other **JOIN**s with that code.

## Controls (default)

| | Player 1 | Player 2 |
|---|---|---|
| Move / Jump / Crouch | `W A S D` | Arrow keys |
| Light / Heavy Punch | `F` / `G` | Num `1` / `2` |
| Light / Heavy Kick | `V` / `B` | Num `4` / `5` |
| Super / Macro | `R` / `T` | Num `7` / `8` |
| Menu confirm / back | `Enter` / `Esc` | |

Gamepads work too (Xbox layout: X/Y = punches, A/B = kicks, L/R = super/macro).
Rebind P1 in **Options ▸ Edit P1 controls**.

Motions: `qcf` = ↓↘→, `qcb` = ↓↙←, `dp` = →↓↘, charge = hold ←/↓ ~40f then release.
Throw = LP+LK together. Dash = tap → →. Air-block = hold away while airborne.

## The roster

| # | Fighter | Style | Signature |
|---|---|---|---|
| 1 | **Kaito** | All-rounder | Hadou bolt, Rising Fang uppercut, Cyclone Heel |
| 2 | **Bruno** | Grappler | 360 Bear Hug, armoured Iron Lariat, Grave Breaker super |
| 3 | **Vesper** | Zoner | Needle Shot, Falling Snare trap, Arrow Storm |
| 4 | **Rieko** | Rushdown | 3-part Redline rekka, Meteor Dive, Full Overdrive |
| 5 | **Grigor** | Charge boxer | Piston Rush, Skyfall Upper, Anvil Barrage |
| 6 | **Anira** | Aerial | double jump + airdash, divekick, Falcon Tempest |
| 7 | **Tomas** | Stance switch | tap `S1` to flip Flow ⇄ Stone (different movesets) |
| 8 | **Nadia** | Puppeteer | `S2` summons a shade, `qcf+S2` orders it to strike |
| 9 | **Sable** | Counter | armoured Mirror Guard, invincible Shadow Step, Final Verdict |
| 10 | **Goliath** | Reach bruiser | long disjoints, armour everywhere — the Arcade final boss |

Kaito, Bruno and Vesper are the fully-tuned trio; the rest are complete but
rougher. A `·` on the select screen marks the rough-tuned seven.

## Project layout

```
shared/                deterministic game core (imported by client AND server)
  src/sim/             fixed-point 60 Hz sim: step.ts, state.ts, collision, motion, checksum
  src/data/            10 character move-set modules, stages, move-builder DSL
  src/protocol.ts      netplay wire messages
  test/                vitest: determinism, collision, motion, per-character smoke
client/                Vite app
  src/core/            loop, canvas scaler, input (kbd+pad), audio synth, asset loader
  src/render/          stage/parallax, fighter sprites, HUD, FX, hitbox overlay
  src/game/match.ts    MatchRunner: sim + render + event/audio glue
  src/ai/cpu.ts        rule-based CPU with 3 difficulty tiers + per-character combo tables
  src/net/             WebSocket client, delay-based lockstep session
  src/scenes/          boot, menu, char select, versus, arcade, story, online, options
tools/                 procedural asset generators (PNG encoder, pixel figure, sprite/stage gen)
server/                Node WebSocket lockstep relay (rooms by code; no simulation)
```

## How it works

- **Determinism.** The sim is a pure `step(state, [p1bits, p2bits]) -> state` at a
  fixed 60 Hz. All positions/velocities are integers (`256 units = 1 px`), RNG is a
  seeded mulberry32 held *inside* the state, and no trig is used in gameplay. The
  same input log always produces the same `checksum(state)`.
- **Netplay** is delay-based lockstep (default 3 frames, set in Options). Each peer
  sends its input for frame `F+delay` and only steps frame `F` once both inputs for
  it are in hand — so both machines run the identical sim. Every 30 frames the peers
  swap a state checksum; a mismatch halts the match with a desync notice. No
  rollback (fine on LAN / low-latency; playable on good connections).
- **The clock** is driven by a Web Worker timer so matches keep running (and stay in
  sync) even when the tab is backgrounded.
- **Art** is generated, not hand-drawn: `tools/` renders parametric blocky pixel
  fighters (one palette + proportion set per character) into sprite sheets + JSON
  atlases, and parallax stage layers, using a dependency-free PNG encoder. Re-run
  `npm run gen:assets` after tweaking `tools/figure.ts` / `tools/clips.ts`. Drop-in
  hand-drawn sheets are supported — keep the `atlas.json` format.
- **Audio** is entirely synthesised at runtime (WebAudio) — hits, blocks, supers,
  announcer blips, and a per-stage procedural BGM loop. No audio files.

## Scripts

| command | what |
|---|---|
| `npm run dev` | generate assets, run client + server together |
| `npm run dev:client` / `dev:server` | run one side |
| `npm test` | vitest suite (determinism, collision, motion, roster smoke) |
| `npm run verify:determinism` | record an input log, replay ×2, assert equal checksums |
| `npm run gen:assets` | regenerate sprite sheets + stages |
| `npm run build` | typecheck, build static `client/dist`, compile `server/dist` |
| `npm run typecheck` | whole-repo `tsc --noEmit` |

## Deploying

- **Client**: `npm run build` → serve `client/dist` as static files anywhere.
- **Server**: `node server/dist/index.js` (or `npm -w @mugen/server start`).
  Listens on `PORT` (default 8080). Point clients at it via **Options** (the
  `serverUrl` setting) — it defaults to `ws(s)://<page-host>:8080`.

## Adding a character

1. Copy `shared/src/data/characters/kaito.ts`, give it a new `id`, `palette`,
   `build`, `stats`, and `moves` (use the `normal` / `special` / `superMove` /
   `hit` / `proj` builders in `data/moves.ts`).
2. Register it in `shared/src/data/index.ts` (`CHARACTERS` array).
3. `npm run gen:assets` to produce its sprite sheet + portrait.
4. It now appears on every select screen, the Arcade pool, and Story (add an arc in
   `client/src/data/story.ts` for a bespoke campaign, otherwise it uses the default).
