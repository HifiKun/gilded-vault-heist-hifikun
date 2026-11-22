// Gilded Vault — all canvas drawing. One draw call per frame paints the
// floor, walls, vision cones, cameras, guards, loot, thief, particles and
// the HUD; menu screens paint over a dimmed playfield.
import { VIEW_W, VIEW_H, HUD_H, TILE, FIELD_W, FIELD_H, COLS, ROWS } from './config.js';
import { LEVELS, TOTALS } from './levels.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_LEVEL_DONE = 'leveldone';
export const SCREEN_WIN = 'win';

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  let trauma = 0;
  let particles = [];
  let flash = 0; // red flash 0..1 on being spotted
  let flashColor = '255,60,60';

  function shake(amount) { trauma = Math.min(1, trauma + amount); }
  function burst(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 140;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.4, max: 0.9, color, r: 2 + Math.random() * 3 });
    }
  }
  function spotFlash() { flash = 1; flashColor = '255,60,60'; }

  function drawCone(x, y, angle, range, half, fill, edge) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, angle - half, angle + half);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawFloor(pal) {
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? pal.floor : pal.floorAlt;
        ctx.fillRect(tx * TILE, HUD_H + ty * TILE, TILE, TILE);
      }
    }
    // faint carpet runner down the middle of the hall
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, HUD_H + FIELD_H / 2 - TILE, FIELD_W, TILE * 2);
  }

  function drawWalls(world) {
    for (const r of world.walls) {
      ctx.fillStyle = world.palette.wall;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = world.palette.wallTop;
      ctx.fillRect(r.x, r.y, r.w, 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    }
    // outer border
    ctx.strokeStyle = world.palette.wallTop;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, HUD_H + 2, FIELD_W - 4, FIELD_H - 4);
  }

  function drawExit(world) {
    const allLoot = world.lootGot >= world.lootTotal;
    const { x, y } = world.exit;
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 300);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = allLoot ? `rgba(80,255,140,${0.35 + 0.3 * pulse})` : 'rgba(255,80,80,0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = allLoot ? '#50ff8c' : '#ff5050';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();
    // door
    ctx.fillStyle = allLoot ? '#1d5c33' : '#5c1d1d';
    ctx.fillRect(-14, -18, 28, 36);
    ctx.fillStyle = allLoot ? '#50ff8c' : '#ff8080';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(allLoot ? 'EXIT' : 'LOCK', 0, 4);
    ctx.restore();
    if (!allLoot) {
      ctx.fillStyle = '#ffb0b0';
      ctx.font = '12px sans-serif';
      // The exit sits in the top-right corner, so anchor the hint inside
      // the canvas instead of centring it under the door (it would clip).
      if (x > VIEW_W / 2) {
        ctx.textAlign = 'right';
        ctx.fillText(`Grab all ${world.lootTotal} loot to open the exit`, VIEW_W - 12, y + 44);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(`Grab all ${world.lootTotal} loot to open the exit`, 12, y + 44);
      }
    }
  }

  function drawLoot(world) {
    for (const l of world.loot) {
      if (l.taken) continue;
      const bob = Math.sin(l.bob * 3) * 3;
      const y = l.y + bob;
      ctx.save();
      ctx.translate(l.x, y);
      ctx.shadowColor = world.palette.lootGlow;
      ctx.shadowBlur = 14;
      if (l.kind === 'gold') {
        ctx.fillStyle = '#ffd65a';
        ctx.beginPath();
        ctx.moveTo(-13, 8); ctx.lineTo(-9, -8); ctx.lineTo(9, -8); ctx.lineTo(13, 8);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff0b0';
        ctx.fillRect(-7, -5, 14, 3);
      } else if (l.kind === 'chips') {
        const cols = ['#ff5ac8', '#5ac8ff', '#ffe95a'];
        cols.forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.ellipse(0, 6 - i * 6, 12, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(0, -12, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // relic: little vase
        ctx.fillStyle = '#7cc8ff';
        ctx.beginPath();
        ctx.moveTo(-6, -12); ctx.quadraticCurveTo(-14, 0, -7, 10);
        ctx.lineTo(7, 10); ctx.quadraticCurveTo(14, 0, 6, -12);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e8f6ff';
        ctx.fillRect(-8, -14, 16, 4);
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd65a';
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawCameras(world) {
    for (const c of world.cameras) {
      drawCone(c.x, c.y, c.angle, 270, 0.5, world.palette.cone, world.palette.coneEdge);
    }
    for (const c of world.cameras) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = '#222';
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.rotate(c.angle);
      ctx.fillStyle = '#ff4040';
      ctx.fillRect(6, -4, 14, 8);
      ctx.beginPath();
      ctx.arc(20, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ff8080';
      ctx.fill();
      ctx.restore();
    }
  }

  function drawGuards(world) {
    for (const g of world.guards) {
      const alerted = g.state === 'chase' || g.state === 'search';
      drawCone(g.x, g.y, g.angle, 230, 0.61,
        alerted ? 'rgba(255,60,60,0.28)' : world.palette.cone,
        alerted ? 'rgba(255,60,60,0.7)' : world.palette.coneEdge);
    }
    for (const g of world.guards) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angle);
      // body: navy uniform, direction nose
      ctx.fillStyle = g.state === 'chase' ? '#a02020' : '#2c4a6b';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dfe9f5';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffd65a';
      ctx.beginPath();
      ctx.moveTo(16, 0); ctx.lineTo(6, -6); ctx.lineTo(6, 6);
      ctx.closePath(); ctx.fill();
      // cap brim
      ctx.fillStyle = '#16283a';
      ctx.fillRect(-4, -14, 10, 5);
      ctx.restore();
      if (g.state === 'chase') {
        ctx.fillStyle = '#ff5050';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', g.x, g.y - 22);
      } else if (g.state === 'search') {
        ctx.fillStyle = '#ffd65a';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', g.x, g.y - 22);
      }
    }
  }

  function drawPlayer(world) {
    const p = world.player;
    const blink = p.sneak ? 0.75 : 1;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = blink;
    ctx.rotate(p.dir);
    // hooded thief: dark cloak, pale mask band, little satchel
    ctx.fillStyle = '#1a1a22';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = world.palette.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e8e8f0';
    ctx.fillRect(2, -7, 10, 14); // mask band
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(8, -4, 4, 3);
    ctx.fillRect(8, 1, 4, 3);
    ctx.fillStyle = '#8a6d2f';
    ctx.beginPath();
    ctx.arc(-8, 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (p.sneak) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('sneaking', p.x, p.y + 26);
    }
  }

  function drawParticles(dt) {
    particles = particles.filter((pt) => (pt.life -= dt) > 0);
    for (const pt of particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(world, best, muted) {
    const level = LEVELS[world.levelIndex];
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(0, 0, VIEW_W, HUD_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HUD_H - 0.5);
    ctx.lineTo(VIEW_W, HUD_H - 0.5);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(`HEIST ${world.levelIndex + 1}/3 — ${level.name}`, 16, 28);
    ctx.fillStyle = '#9aa4b2';
    ctx.font = '13px sans-serif';
    ctx.fillText(level.place, 16, 50);

    // alarm meter, centre
    const ax = 470;
    const aw = 340;
    ctx.fillStyle = '#9aa4b2';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ALARM', ax, 24);
    ctx.fillStyle = '#222';
    ctx.fillRect(ax, 32, aw, 16);
    const frac = world.alarm / 100;
    const grad = ctx.createLinearGradient(ax, 0, ax + aw, 0);
    grad.addColorStop(0, '#37d67a');
    grad.addColorStop(0.5, '#ffd65a');
    grad.addColorStop(1, '#ff4040');
    ctx.fillStyle = grad;
    ctx.fillRect(ax, 32, aw * frac, 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(ax, 32, aw, 16);
    if (world.lockdown) {
      ctx.fillStyle = '#ff4040';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!! LOCKDOWN !!', ax + aw / 2, 68);
    } else if (world.seenNow) {
      ctx.fillStyle = '#ff8080';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SPOTTED!', ax + aw / 2, 68);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(`LOOT ${world.lootGot}/${world.lootTotal}`, VIEW_W - 16, 28);
    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    ctx.fillText(`SCORE ${world.score}   BEST ${best}   ${Math.floor(world.levelTime)}s${muted ? '   MUTED' : ''}`, VIEW_W - 16, 52);
  }

  function dim() {
    ctx.fillStyle = 'rgba(5,6,10,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function panel(title, lines, foot) {
    const w = 640;
    const h = 130 + lines.length * 30;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2 - 30;
    ctx.fillStyle = 'rgba(13,15,20,0.94)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#8a6d2f';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(title, VIEW_W / 2, y + 52);
    ctx.fillStyle = '#e8e8f0';
    ctx.font = '17px sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, y + 92 + i * 30));
    if (foot) {
      ctx.fillStyle = '#9aa4b2';
      ctx.font = '14px sans-serif';
      ctx.fillText(foot, VIEW_W / 2, y + h - 18);
    }
  }

  function drawTitle(world, best) {
    drawPlayfield(world, 0);
    dim();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText('GILDED VAULT', VIEW_W / 2, 190);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`${TOTALS.heists} Heists  ·  ${TOTALS.guards} Guards  ·  ${TOTALS.cameras} Cameras  ·  ${TOTALS.loot} Loot`, VIEW_W / 2, 232);
    ctx.fillStyle = '#c8ccd4';
    ctx.font = '16px sans-serif';
    ctx.fillText('A top-down stealth heist in three rooms. Grab every loot, dodge the', VIEW_W / 2, 300);
    ctx.fillText('vision cones, and slip out the exit before the alarm hits 100.', VIEW_W / 2, 324);
    ctx.fillStyle = '#ffd65a';
    ctx.font = '15px sans-serif';
    ctx.fillText('1 · The Gilded Vault      2 · Neon Casino      3 · Midnight Museum', VIEW_W / 2, 372);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText('WASD / arrows to move  ·  Shift to sneak  ·  P pause  ·  M mute', VIEW_W / 2, 428);
    ctx.fillStyle = '#9aa4b2';
    ctx.font = '15px sans-serif';
    ctx.fillText('Walk over loot to grab it. Guards and cameras raise the alarm when they see you.', VIEW_W / 2, 458);
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Press Space or click to start the first heist', VIEW_W / 2, 520);
    if (best > 0) {
      ctx.fillStyle = '#9aa4b2';
      ctx.font = '15px sans-serif';
      ctx.fillText(`Best score: ${best}`, VIEW_W / 2, 556);
    }
  }

  function drawPlayfield(world, dt) {
    const pal = LEVELS[world.levelIndex].palette;
    world.palette = pal;
    ctx.save();
    if (trauma > 0) {
      const s = trauma * trauma * 7;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    drawFloor(pal);
    drawExit(world);
    drawLoot(world);
    drawCameras(world);
    drawGuards(world);
    drawPlayer(world);
    drawWalls(world);
    drawParticles(dt);
    ctx.restore();
    trauma = Math.max(0, trauma - dt * 1.6);
    if (flash > 0) {
      ctx.fillStyle = `rgba(${flashColor},${(flash * 0.16).toFixed(3)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      flash = Math.max(0, flash - dt * 2.2);
    }
  }

  function draw(world, screen, best, dt, muted, extra = {}) {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (screen === SCREEN_TITLE) {
      drawTitle(world, best);
      return;
    }
    drawPlayfield(world, dt);
    drawHud(world, best, muted);
    if (screen === SCREEN_PAUSED) {
      dim();
      panel('PAUSED', ['Take a breath. The guards wait for no one,', 'but the pause button does.'], 'Space / P to resume · R to restart the heist');
    } else if (screen === SCREEN_OVER) {
      dim();
      panel('BUSTED!', [
        `The guards caught you in ${LEVELS[world.levelIndex].name}.`,
        `Score so far: ${world.score}  ·  Loot ${world.lootGot}/${world.lootTotal}`,
      ], 'Space / R to retry this heist');
    } else if (screen === SCREEN_LEVEL_DONE) {
      dim();
      const level = LEVELS[world.levelIndex];
      panel(`${level.name.toUpperCase()} — CLEAN GETAWAY`, [
        `Loot ${world.lootGot}/${world.lootTotal}  ·  Peak alarm ${Math.round(world.peakAlarm)}%`,
        world.ghost ? 'GHOST bonus +500 — never spotted past 50% alarm.' : 'No ghost bonus this time — the alarm climbed past 50%.',
        `Heist score ${world.levelScore}  ·  Total ${world.score}`,
      ], 'Space / click for the next heist');
    } else if (screen === SCREEN_WIN) {
      dim();
      panel('ALL THREE HEISTS — DONE', [
        `Final score ${world.score}  ·  Best ${Math.max(best, world.score)}`,
        `21 loot, 12 guards, 9 cameras — and you walked out clean.`,
      ], 'Space / R to run it all again');
    }
    if (extra.note) {
      ctx.fillStyle = 'rgba(13,15,20,0.85)';
      ctx.fillRect(16, VIEW_H - 40, 560, 26);
      ctx.fillStyle = '#ffd65a';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(extra.note, 26, VIEW_H - 22);
    }
  }

  return { draw, shake, burst, spotFlash };
}
