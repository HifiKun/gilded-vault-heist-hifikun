// Gilded Vault — the simulation. Pure logic, no DOM: guards run a small FSM
// (patrol -> chase -> search -> return), cameras sweep and radio the nearest
// guard, and the alarm meter is the shared pressure gauge.
import {
  TILE, HUD_H, FIELD_W, FIELD_H, PLAYER_SPEED, SNEAK_SPEED,
  GUARD_PATROL_SPEED, GUARD_CHASE_SPEED, GUARD_SEARCH_SPEED,
  GUARD_RANGE, GUARD_HALF_ANGLE, CAMERA_RANGE, CAMERA_HALF_ANGLE,
  CATCH_RADIUS, ALARM_SEEN_RATE, ALARM_SNEAK_FACTOR, ALARM_DECAY,
  ALARM_LOCKDOWN, GHOST_BONUS, TIME_BONUS_PER_SEC,
} from './config.js';
import { LEVELS, tileCenter } from './levels.js';

export const EVENT_LOOT = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_LEVEL_DONE = 8;
export const EVENT_WIN = 16;
export const EVENT_LOCKDOWN = 32;

const GUARD_PATROL = 'patrol';
const GUARD_CHASE = 'chase';
const GUARD_SEARCH = 'search';
const GUARD_RETURN = 'return';

// Walls of a level as pixel rects (x, y relative to the canvas).
function wallRects(level) {
  return level.walls.map((w) => ({
    x: w.x * TILE, y: HUD_H + w.y * TILE, w: w.w * TILE, h: w.h * TILE,
  }));
}

function pointInWalls(x, y, walls) {
  for (const r of walls) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return true;
  }
  return false;
}

// Circle vs walls: axis-separated so the thief slides along a wall instead
// of sticking to it.
function moveWithCollision(pos, dx, dy, radius, walls) {
  const nx = pos.x + dx;
  if (!pointInWalls(nx + Math.sign(dx) * radius, pos.y, walls)
    && !pointInWalls(nx + Math.sign(dx) * radius, pos.y - radius * 0.7, walls)
    && !pointInWalls(nx + Math.sign(dx) * radius, pos.y + radius * 0.7, walls)) {
    pos.x = nx;
  }
  const ny = pos.y + dy;
  if (!pointInWalls(pos.x, ny + Math.sign(dy) * radius, walls)
    && !pointInWalls(pos.x - radius * 0.7, ny + Math.sign(dy) * radius, walls)
    && !pointInWalls(pos.x + radius * 0.7, ny + Math.sign(dy) * radius, walls)) {
    pos.y = ny;
  }
  pos.x = Math.max(radius, Math.min(FIELD_W - radius, pos.x));
  pos.y = Math.max(HUD_H + radius, Math.min(HUD_H + FIELD_H - radius, pos.y));
}

// Line of sight: sample the segment; a wall tile anywhere along it blocks.
function hasLineOfSight(x0, y0, x1, y1, walls) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 12));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointInWalls(x0 + dx * t, y0 + dy * t, walls)) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function observerSees(ox, oy, angle, range, halfAngle, px, py, walls) {
  const dx = px - ox;
  const dy = py - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist > 8 && Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > halfAngle) return false;
  return hasLineOfSight(ox, oy, px, py, walls);
}

function makeGuard(def, walls) {
  const start = tileCenter(def.path[0][0], def.path[0][1]);
  const next = tileCenter(def.path[1][0], def.path[1][1]);
  return {
    x: start.x, y: start.y,
    angle: Math.atan2(next.y - start.y, next.x - start.x),
    path: def.path.map(([tx, ty]) => tileCenter(tx, ty)),
    wp: 1, wait: 0, stuck: 0,
    state: GUARD_PATROL, speedMul: def.speed,
    lastSeen: null, seenTimer: 0, searchTimer: 0, scanAngle: 0,
  };
}

function makeCamera(def) {
  const p = tileCenter(def.x, def.y);
  return { x: p.x, y: p.y, a0: def.a0, a1: def.a1, period: def.period, angle: (def.a0 + def.a1) / 2, t: 0 };
}

export function createWorld() {
  return {
    levelIndex: 0,
    player: { x: 0, y: 0, dir: 0, sneak: false, moving: false },
    guards: [], cameras: [], loot: [],
    walls: [], exit: null,
    alarm: 0, peakAlarm: 0, lockdown: false, lockdownTimer: 0,
    score: 0, time: 0, levelTime: 0,
    lootGot: 0, lootTotal: 0,
    levelDone: false, won: false, busted: false,
    levelScore: 0, ghost: false,
    seenNow: false, anySpotted: false,
  };
}

export function loadLevel(world, index) {
  const level = LEVELS[index];
  world.levelIndex = index;
  const start = tileCenter(level.start.x, level.start.y);
  world.player.x = start.x;
  world.player.y = start.y;
  world.player.dir = 0;
  world.walls = wallRects(level);
  world.guards = level.guards.map((g) => makeGuard(g, world.walls));
  world.cameras = level.cameras.map(makeCamera);
  world.loot = level.loot.map((l) => {
    const p = tileCenter(l.x, l.y);
    return { x: p.x, y: p.y, kind: l.kind, value: l.value, taken: false, bob: 0 };
  });
  world.exit = tileCenter(level.exit.x, level.exit.y);
  world.alarm = 0;
  world.peakAlarm = 0;
  world.lockdown = false;
  world.lockdownTimer = 0;
  world.levelTime = 0;
  world.lootGot = 0;
  world.lootTotal = level.loot.length;
  world.levelDone = false;
  world.busted = false;
  world.levelScore = 0;
  world.ghost = false;
  world.seenNow = false;
}

function stepGuard(world, g, dt) {
  const p = world.player;
  const sees = observerSees(g.x, g.y, g.angle, GUARD_RANGE, GUARD_HALF_ANGLE, p.x, p.y, world.walls);
  if (sees) {
    g.lastSeen = { x: p.x, y: p.y };
    g.seenTimer = 0;
    if (g.state !== GUARD_CHASE) g.state = GUARD_CHASE;
  } else if (g.state === GUARD_CHASE) {
    g.seenTimer += dt;
    if (g.seenTimer > 2.5) {
      g.state = GUARD_SEARCH;
      g.searchTimer = 0;
      g.scanAngle = g.angle;
    }
  }

  const before = { x: g.x, y: g.y };
  if (g.state === GUARD_PATROL) {
    if (g.wait > 0) {
      g.wait -= dt;
    } else {
      const target = g.path[g.wp];
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        g.wp = (g.wp + 1) % g.path.length;
        g.wait = 0.6;
      } else {
        const sp = GUARD_PATROL_SPEED * g.speedMul;
        g.angle = Math.atan2(dy, dx);
        moveWithCollision(g, (dx / dist) * sp * dt, (dy / dist) * sp * dt, 14, world.walls);
      }
    }
  } else if (g.state === GUARD_CHASE) {
    const target = g.lastSeen ?? { x: p.x, y: p.y };
    const dx = target.x - g.x;
    const dy = target.y - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 10) {
      g.angle = Math.atan2(dy, dx);
      moveWithCollision(g, (dx / dist) * GUARD_CHASE_SPEED * dt, (dy / dist) * GUARD_CHASE_SPEED * dt, 14, world.walls);
    }
  } else if (g.state === GUARD_SEARCH) {
    g.searchTimer += dt;
    g.scanAngle += dt * 1.8;
    g.angle = g.scanAngle;
    if (g.lastSeen) {
      const dx = g.lastSeen.x - g.x;
      const dy = g.lastSeen.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 18) {
        moveWithCollision(g, (dx / dist) * GUARD_SEARCH_SPEED * dt, (dy / dist) * GUARD_SEARCH_SPEED * dt, 14, world.walls);
      }
    }
    if (g.searchTimer > 3.5) g.state = GUARD_RETURN;
  } else { // GUARD_RETURN
    let best = 0;
    let bestDist = Infinity;
    g.path.forEach((wp, i) => {
      const d = Math.hypot(wp.x - g.x, wp.y - g.y);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    const target = g.path[best];
    const dx = target.x - g.x;
    const dy = target.y - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      g.wp = best;
      g.state = GUARD_PATROL;
    } else {
      g.angle = Math.atan2(dy, dx);
      moveWithCollision(g, (dx / dist) * GUARD_PATROL_SPEED * dt, (dy / dist) * GUARD_PATROL_SPEED * dt, 14, world.walls);
    }
  }
  const moved = Math.hypot(g.x - before.x, g.y - before.y);
  if (moved < 0.5 && g.state !== GUARD_SEARCH && g.wait <= 0) {
    g.stuck += dt;
    if (g.stuck > 1.2) {
      g.wp = (g.wp + 1) % g.path.length;
      g.state = GUARD_PATROL;
      g.stuck = 0;
    }
  } else {
    g.stuck = 0;
  }
  return sees;
}

export function stepWorld(world, dt, input) {
  let events = 0;
  if (world.levelDone || world.won || world.busted) return events;
  world.time += dt;
  world.levelTime += dt;

  // --- player ---
  const p = world.player;
  const ix = input.x;
  const iy = input.y;
  p.moving = ix !== 0 || iy !== 0;
  p.sneak = !!input.sneak;
  if (p.moving) {
    const len = Math.hypot(ix, iy);
    const sp = (p.sneak ? SNEAK_SPEED : PLAYER_SPEED);
    const dx = (ix / len) * sp * dt;
    const dy = (iy / len) * sp * dt;
    p.dir = Math.atan2(dy, dx);
    moveWithCollision(p, dx, dy, 14, world.walls);
  }

  // --- cameras sweep ---
  for (const cam of world.cameras) {
    cam.t += dt;
    const mid = (cam.a0 + cam.a1) / 2;
    const amp = (cam.a1 - cam.a0) / 2;
    cam.angle = mid + amp * Math.sin((Math.PI * 2 * cam.t) / cam.period);
  }

  // --- perception ---
  let seen = false;
  let wasSpotted = world.anySpotted;
  for (const g of world.guards) {
    if (stepGuard(world, g, dt)) seen = true;
  }
  for (const cam of world.cameras) {
    if (observerSees(cam.x, cam.y, cam.angle, CAMERA_RANGE, CAMERA_HALF_ANGLE, p.x, p.y, world.walls)) {
      seen = true;
      // The camera radios the nearest guard to the thief's position.
      let nearest = null;
      let nearestDist = Infinity;
      for (const g of world.guards) {
        const d = Math.hypot(g.x - p.x, g.y - p.y);
        if (d < nearestDist) { nearestDist = d; nearest = g; }
      }
      if (nearest && nearest.state === GUARD_PATROL) {
        nearest.lastSeen = { x: p.x, y: p.y };
        nearest.seenTimer = 0;
        nearest.state = GUARD_SEARCH;
        nearest.searchTimer = 0;
      }
    }
  }
  world.seenNow = seen;
  world.anySpotted = seen;
  if (seen && !wasSpotted) events |= EVENT_SPOTTED;

  // --- alarm ---
  if (seen) {
    world.alarm += ALARM_SEEN_RATE * (p.sneak ? ALARM_SNEAK_FACTOR : 1) * dt;
  } else {
    world.alarm -= ALARM_DECAY * dt;
  }
  world.alarm = Math.max(0, Math.min(ALARM_LOCKDOWN, world.alarm));
  world.peakAlarm = Math.max(world.peakAlarm, world.alarm);
  if (world.alarm >= ALARM_LOCKDOWN && !world.lockdown) {
    world.lockdown = true;
    world.lockdownTimer = 0;
    events |= EVENT_LOCKDOWN;
    for (const g of world.guards) {
      g.lastSeen = { x: p.x, y: p.y };
      g.seenTimer = 0;
      g.state = GUARD_CHASE;
    }
  }
  if (world.lockdown) {
    world.lockdownTimer += dt;
    if (!seen && world.lockdownTimer > 4) {
      world.lockdown = false;
      world.alarm = 60;
    }
  }

  // --- caught? ---
  for (const g of world.guards) {
    if (Math.hypot(g.x - p.x, g.y - p.y) < CATCH_RADIUS) {
      world.busted = true;
      return events | EVENT_CAUGHT;
    }
  }

  // --- loot ---
  for (const l of world.loot) {
    l.bob += dt;
    if (!l.taken && Math.hypot(l.x - p.x, l.y - p.y) < 30) {
      l.taken = true;
      world.lootGot += 1;
      world.score += l.value;
      world.levelScore += l.value;
      events |= EVENT_LOOT;
    }
  }

  // --- exit ---
  const allLoot = world.lootGot >= world.lootTotal;
  if (allLoot && Math.hypot(world.exit.x - p.x, world.exit.y - p.y) < 34) {
    const level = LEVELS[world.levelIndex];
    const ghost = world.peakAlarm <= 50;
    let bonus = 0;
    if (ghost) bonus += GHOST_BONUS;
    bonus += Math.max(0, Math.round((level.par - world.levelTime) * TIME_BONUS_PER_SEC));
    world.score += bonus;
    world.levelScore += bonus;
    world.ghost = ghost;
    world.levelDone = true;
    if (world.levelIndex + 1 >= LEVELS.length) {
      world.won = true;
      return events | EVENT_LEVEL_DONE | EVENT_WIN;
    }
    return events | EVENT_LEVEL_DONE;
  }
  return events;
}

export function nextLevel(world) {
  loadLevel(world, world.levelIndex + 1);
}

export function resetRun(world) {
  world.score = 0;
  world.time = 0;
  world.won = false;
  loadLevel(world, 0);
}
