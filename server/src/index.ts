import { randomInt } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  PROTOCOL_VERSION,
  type ClientMsg,
  type ServerMsg,
} from '@mugen/shared';

const PORT = Number(process.env.PORT ?? 8080);

interface Client {
  ws: WebSocket;
  id: string;
  name: string;
  room: Room | null;
  slot: 0 | 1;
  alive: boolean;
}

interface Sel {
  charId: string;
  ready: boolean;
  stage: string;
}

interface Room {
  code: string;
  clients: (Client | null)[];
  inputDelay: number;
  roundsToWin: number;
  sel: (Sel | null)[];
  started: boolean;
  rematch: boolean[];
}

const rooms = new Map<string, Room>();
let nextId = 1;

function send(c: Client | null, m: ServerMsg): void {
  if (c && c.ws.readyState === c.ws.OPEN) c.ws.send(JSON.stringify(m));
}

function other(room: Room, slot: 0 | 1): Client | null {
  return room.clients[slot === 0 ? 1 : 0];
}

function makeCode(): string {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) code += alpha[randomInt(alpha.length)];
  } while (rooms.has(code));
  return code;
}

function maybeStart(room: Room): void {
  if (room.started) return;
  if (!room.clients[0] || !room.clients[1]) return;
  if (!room.sel[0]?.ready || !room.sel[1]?.ready) return;
  room.started = true;
  const seed = randomInt(0x7fffffff);
  const p1 = room.sel[0]!.charId;
  const p2 = room.sel[1]!.charId;
  const stage = room.sel[0]!.stage || room.sel[1]!.stage || 'dojo';
  const msg: ServerMsg = { t: 'start', seed, p1, p2, stage, startFrame: 0 };
  send(room.clients[0], msg);
  send(room.clients[1], msg);
  console.log(`[${room.code}] start ${p1} vs ${p2} @ ${stage} seed=${seed}`);
}

function maybeRematch(room: Room): void {
  if (!room.rematch[0] || !room.rematch[1]) return;
  room.rematch = [false, false];
  const seed = randomInt(0x7fffffff);
  send(room.clients[0], { t: 'rematch', seed });
  send(room.clients[1], { t: 'rematch', seed });
  console.log(`[${room.code}] rematch seed=${seed}`);
}

function leaveRoom(c: Client): void {
  const room = c.room;
  if (!room) return;
  room.clients[c.slot] = null;
  const o = other(room, c.slot);
  if (o) send(o, { t: 'peer_left' });
  c.room = null;
  if (!room.clients[0] && !room.clients[1]) {
    rooms.delete(room.code);
    console.log(`[${room.code}] closed`);
  } else {
    // allow the room to be re-joined if match had not started
    room.started = false;
    room.sel[c.slot] = null;
  }
}

const wss = new WebSocketServer({ port: PORT });
console.log(`mugen netplay relay listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  const client: Client = {
    ws,
    id: `c${nextId++}`,
    name: 'player',
    room: null,
    slot: 0,
    alive: true,
  };

  ws.on('message', (raw) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw.toString()) as ClientMsg;
    } catch {
      return;
    }
    handle(client, msg);
  });

  ws.on('close', () => {
    leaveRoom(client);
  });
  ws.on('error', () => {
    leaveRoom(client);
  });
});

function handle(client: Client, msg: ClientMsg): void {
  switch (msg.t) {
    case 'hello':
      client.name = (msg.name || 'player').slice(0, 16);
      send(client, { t: 'hello_ok', id: client.id });
      break;

    case 'create': {
      if (client.room) leaveRoom(client);
      const code = makeCode();
      const room: Room = {
        code,
        clients: [client, null],
        inputDelay: clamp(msg.inputDelay ?? 3, 1, 8),
        roundsToWin: clamp(msg.roundsToWin ?? 2, 1, 5),
        sel: [null, null],
        started: false,
        rematch: [false, false],
      };
      rooms.set(code, room);
      client.room = room;
      client.slot = 0;
      send(client, {
        t: 'created',
        code,
        slot: 0,
        inputDelay: room.inputDelay,
        roundsToWin: room.roundsToWin,
      });
      console.log(`[${code}] created by ${client.id}`);
      break;
    }

    case 'join': {
      const room = rooms.get((msg.code || '').toUpperCase());
      if (!room) {
        send(client, { t: 'error', message: 'no such room' });
        return;
      }
      if (room.clients[1] || room.started) {
        send(client, { t: 'error', message: 'room full' });
        return;
      }
      if (client.room) leaveRoom(client);
      room.clients[1] = client;
      client.room = room;
      client.slot = 1;
      send(client, {
        t: 'joined',
        code: room.code,
        slot: 1,
        inputDelay: room.inputDelay,
        roundsToWin: room.roundsToWin,
      });
      send(room.clients[0], { t: 'peer', name: client.name, connected: true });
      send(client, { t: 'peer', name: room.clients[0]?.name ?? 'player', connected: true });
      console.log(`[${room.code}] ${client.id} joined`);
      break;
    }

    case 'select': {
      const room = client.room;
      if (!room) return;
      room.sel[client.slot] = {
        charId: msg.charId,
        ready: !!msg.ready,
        stage: msg.stage || 'dojo',
      };
      send(other(room, client.slot), {
        t: 'select',
        slot: client.slot,
        charId: msg.charId,
        ready: !!msg.ready,
        stage: msg.stage || 'dojo',
      });
      maybeStart(room);
      break;
    }

    case 'input': {
      const room = client.room;
      if (!room) return;
      send(other(room, client.slot), {
        t: 'input',
        frame: msg.frame,
        bits: msg.bits | 0,
        slot: client.slot,
      });
      break;
    }

    case 'checksum': {
      const room = client.room;
      if (!room) return;
      send(other(room, client.slot), {
        t: 'checksum',
        frame: msg.frame,
        hash: msg.hash >>> 0,
        slot: client.slot,
      });
      break;
    }

    case 'rematch': {
      const room = client.room;
      if (!room) return;
      room.rematch[client.slot] = true;
      maybeRematch(room);
      break;
    }

    case 'ping':
      send(client, { t: 'pong', ts: msg.ts });
      break;

    case 'pong':
      break;

    case 'leave':
      leaveRoom(client);
      break;

    case 'start_ack':
      break;
  }
  void PROTOCOL_VERSION;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n | 0));
}
