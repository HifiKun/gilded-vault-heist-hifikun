// Deterministic staged scenes for screenshots (?shot=<name>&seed=1).
// Each shot loads a level, then places the thief, guards and cameras by hand
// so the frame shows the whole game at a glance: the room, vision cones,
// a camera, loot, and the alarm meter. Nothing here runs the live loop.
import { loadLevel } from './world.js';
import { tileCenter } from './levels.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

function placeGuard(world, i, tx, ty, angle, state = 'patrol') {
  const g = world.guards[i];
  const p = tileCenter(tx, ty);
  g.x = p.x;
  g.y = p.y;
  g.angle = angle;
  g.state = state;
  if (state === 'chase' || state === 'search') {
    g.lastSeen = { x: world.player.x, y: world.player.y };
  }
  return g;
}

function placeCamera(world, i, t) {
  const c = world.cameras[i];
  c.t = t;
  const mid = (c.a0 + c.a1) / 2;
  const amp = (c.a1 - c.a0) / 2;
  c.angle = mid + amp * Math.sin((Math.PI * 2 * t) / c.period);
  return c;
}

function placePlayer(world, tx, ty, dir = 0, sneak = false) {
  const p = tileCenter(tx, ty);
  world.player.x = p.x;
  world.player.y = p.y;
  world.player.dir = dir;
  world.player.sneak = sneak;
  return world.player;
}

function takeLoot(world, n) {
  let taken = 0;
  for (const l of world.loot) {
    if (taken >= n) break;
    l.taken = true;
    taken += 1;
  }
  world.lootGot = taken;
}

export function stageShot(name, world) {
  if (name === 'title') {
    loadLevel(world, 0);
    placePlayer(world, 5, 7, 0.3);
    placeGuard(world, 0, 2, 4, 1.57);
    placeGuard(world, 1, 13, 8, 3.14);
    placeCamera(world, 0, 1.2);
    world.alarm = 12;
    world.score = 0;
    world.levelTime = 24;
    return { screen: SCREEN_TITLE, best: 2450 };
  }
  if (name === 'vault') {
    loadLevel(world, 0);
    placePlayer(world, 9, 6, -0.5);
    placeGuard(world, 0, 2, 5, 0.0);
    placeGuard(world, 1, 13, 8, 3.14);
    placeGuard(world, 2, 15, 6, 2.6);
    placeCamera(world, 0, 1.2);
    placeCamera(world, 1, 2.0);
    takeLoot(world, 2);
    world.score = 300;
    world.alarm = 18;
    world.levelTime = 47;
    world.seenNow = false;
    return { screen: SCREEN_PLAY, best: 2450 };
  }
  if (name === 'casino') {
    loadLevel(world, 1);
    placePlayer(world, 10, 5, 0.2, true);
    placeGuard(world, 0, 2, 4, 0.0);
    placeGuard(world, 1, 17, 4, 3.14);
    placeGuard(world, 2, 9, 5, 0.35, 'chase');
    placeGuard(world, 3, 10, 2, 1.57);
    placeCamera(world, 0, 1.2);
    placeCamera(world, 1, 3.0);
    placeCamera(world, 2, 2.2);
    takeLoot(world, 4);
    world.score = 780;
    world.alarm = 47;
    world.levelTime = 88;
    world.seenNow = true;
    return { screen: SCREEN_PLAY, best: 2450 };
  }
  if (name === 'museum') {
    loadLevel(world, 2);
    placePlayer(world, 17, 2, -0.6);
    placeGuard(world, 0, 2, 5, 0.0);
    placeGuard(world, 1, 17, 6, 2.8, 'chase');
    placeGuard(world, 2, 5, 6, 1.2, 'search');
    placeGuard(world, 3, 15, 6, 2.2);
    placeGuard(world, 4, 10, 9, 1.57);
    placeCamera(world, 0, 1.0);
    placeCamera(world, 1, 1.6);
    placeCamera(world, 2, 0.6);
    placeCamera(world, 3, 3.4);
    takeLoot(world, 7);
    world.score = 2180;
    world.alarm = 82;
    world.levelTime = 132;
    world.seenNow = true;
    return { screen: SCREEN_PLAY, best: 2450 };
  }
  return null;
}
