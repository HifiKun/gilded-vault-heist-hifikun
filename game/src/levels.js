// The three heists. Coordinates are tiles on the 20x10 playfield (tile = 64 px).
// Walls are {x, y, w, h} in tiles. Guards patrol waypoint loops given as tile
// centres. Cameras sit on a tile and sweep between angles a0..a1 (radians,
// 0 = east, positive clockwise in screen space). Loot and the exit are tiles.
// Totals across the three heists: 12 guards, 9 cameras, 21 loot.
import { TILE, HUD_H } from './config.js';

// Centre of a tile, in canvas pixels.
export function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: HUD_H + (ty + 0.5) * TILE };
}

export const LEVELS = [
  {
    id: 1,
    name: 'The Gilded Vault',
    place: 'Meridian Bank — after closing',
    palette: {
      floor: '#1d2b1f', floorAlt: '#223324', wall: '#4a3b1e', wallTop: '#8a6d2f',
      cone: 'rgba(255, 214, 90, 0.20)', coneEdge: 'rgba(255, 214, 90, 0.55)',
      accent: '#ffd65a', lootGlow: '#ffe9a8',
    },
    par: 150,
    start: { x: 1, y: 9 },
    exit: { x: 19, y: 0 },
    walls: [
      { x: 6, y: 4, w: 8, h: 1 }, // teller counter
      { x: 3, y: 2, w: 1, h: 1 }, { x: 16, y: 2, w: 1, h: 1 },
      { x: 3, y: 7, w: 1, h: 1 }, { x: 16, y: 7, w: 1, h: 1 },
      { x: 15, y: 3, w: 2, h: 1 }, { x: 18, y: 3, w: 2, h: 1 }, // vault room, door gap at x 17
    ],
    guards: [
      { path: [[2, 1], [8, 1]], speed: 1.0 },
      { path: [[10, 8], [17, 8]], speed: 1.0 },
      { path: [[14, 6], [18, 6]], speed: 1.1 },
    ],
    cameras: [
      { x: 10, y: 0, a0: 0.9, a1: 2.2, period: 5 },
      { x: 19, y: 5, a0: 1.9, a1: 4.2, period: 6 },
    ],
    loot: [
      { x: 2, y: 1, kind: 'gold', value: 150 },
      { x: 10, y: 8, kind: 'gold', value: 150 },
      { x: 5, y: 6, kind: 'gold', value: 150 },
      { x: 16, y: 1, kind: 'gold', value: 150 },
      { x: 17, y: 1, kind: 'gold', value: 150 },
      { x: 18, y: 2, kind: 'gold', value: 150 },
    ],
  },
  {
    id: 2,
    name: 'Neon Casino',
    place: 'The Velvet Nine — high-roller floor',
    palette: {
      floor: '#241428', floorAlt: '#2c1830', wall: '#3d1e4d', wallTop: '#a03d8f',
      cone: 'rgba(255, 90, 200, 0.18)', coneEdge: 'rgba(255, 90, 200, 0.5)',
      accent: '#ff5ac8', lootGlow: '#ffc2ec',
    },
    par: 160,
    start: { x: 1, y: 9 },
    exit: { x: 19, y: 0 },
    walls: [
      { x: 4, y: 2, w: 4, h: 1 }, { x: 12, y: 2, w: 4, h: 1 }, // slot rows
      { x: 4, y: 7, w: 4, h: 1 }, { x: 12, y: 7, w: 4, h: 1 },
      { x: 8, y: 4, w: 4, h: 1 }, // bar counter
      { x: 1, y: 4, w: 1, h: 1 }, { x: 18, y: 4, w: 1, h: 1 }, // pillars
    ],
    guards: [
      { path: [[2, 1], [8, 1]], speed: 1.0 },
      { path: [[17, 1], [17, 8]], speed: 1.0 },
      { path: [[6, 5], [13, 5]], speed: 1.1 },
      { path: [[10, 1], [10, 3]], speed: 0.9 },
    ],
    cameras: [
      { x: 10, y: 0, a0: 0.9, a1: 2.2, period: 5 },
      { x: 0, y: 5, a0: -0.6, a1: 0.6, period: 6 },
      { x: 19, y: 9, a0: 3.4, a1: 5.2, period: 7 },
    ],
    loot: [
      { x: 3, y: 3, kind: 'chips', value: 120 },
      { x: 16, y: 3, kind: 'chips', value: 120 },
      { x: 3, y: 8, kind: 'chips', value: 120 },
      { x: 16, y: 8, kind: 'chips', value: 120 },
      { x: 10, y: 5, kind: 'chips', value: 120 },
      { x: 6, y: 1, kind: 'chips', value: 120 },
      { x: 13, y: 9, kind: 'chips', value: 120 },
    ],
  },
  {
    id: 3,
    name: 'Midnight Museum',
    place: 'The Hall of Antiquities — gala night',
    palette: {
      floor: '#16202e', floorAlt: '#1a2636', wall: '#2c3e55', wallTop: '#c9a24b',
      cone: 'rgba(120, 200, 255, 0.18)', coneEdge: 'rgba(120, 200, 255, 0.5)',
      accent: '#7cc8ff', lootGlow: '#cfeaff',
    },
    par: 170,
    start: { x: 1, y: 9 },
    exit: { x: 19, y: 0 },
    walls: [
      { x: 3, y: 2, w: 3, h: 1 }, { x: 9, y: 2, w: 3, h: 1 }, { x: 14, y: 2, w: 3, h: 1 },
      { x: 6, y: 6, w: 3, h: 1 }, { x: 12, y: 6, w: 3, h: 1 },
      { x: 9, y: 4, w: 2, h: 2 }, // central statue plinth
    ],
    guards: [
      { path: [[2, 1], [7, 1]], speed: 1.0 },
      { path: [[17, 1], [17, 8]], speed: 1.0 },
      { path: [[5, 4], [5, 8]], speed: 1.0 },
      { path: [[14, 4], [14, 8]], speed: 1.1 },
      { path: [[8, 9], [12, 9]], speed: 0.9 },
    ],
    cameras: [
      { x: 0, y: 0, a0: 0.2, a1: 1.4, period: 5 },
      { x: 10, y: 0, a0: 0.9, a1: 2.2, period: 6 },
      { x: 18, y: 0, a0: 0.9, a1: 2.2, period: 5 },
      { x: 19, y: 9, a0: 3.4, a1: 5.4, period: 7 },
    ],
    loot: [
      { x: 3, y: 1, kind: 'relic', value: 200 },
      { x: 7, y: 1, kind: 'relic', value: 200 },
      { x: 12, y: 1, kind: 'relic', value: 200 },
      { x: 16, y: 1, kind: 'relic', value: 200 },
      { x: 2, y: 5, kind: 'relic', value: 200 },
      { x: 17, y: 5, kind: 'relic', value: 200 },
      { x: 5, y: 9, kind: 'relic', value: 200 },
      { x: 14, y: 9, kind: 'relic', value: 200 },
    ],
  },
];

// Totals the title screen and the README spell out.
export const TOTALS = {
  heists: LEVELS.length,
  guards: LEVELS.reduce((n, l) => n + l.guards.length, 0),
  cameras: LEVELS.reduce((n, l) => n + l.cameras.length, 0),
  loot: LEVELS.reduce((n, l) => n + l.loot.length, 0),
};
