// Gilded Vault — boot and the one loop. Fixed 1/60 s steps, four screens
// (title, play, paused, game over) plus the level-clear and win screens.
// ?shot=title|vault|casino|museum (with &seed=N) stages that scene instead
// of running the loop, paints it twice and sets window.__shotReady.
import { STEP, BEST_KEY } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, loadLevel, stepWorld, nextLevel,
  EVENT_LOOT, EVENT_SPOTTED, EVENT_CAUGHT, EVENT_LEVEL_DONE,
  EVENT_WIN, EVENT_LOCKDOWN,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED,
  SCREEN_OVER, SCREEN_LEVEL_DONE, SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
void createRandom(seed);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
const renderer = createRenderer(canvas);
const audio = createAudio();
loadLevel(world, 0);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  if (!scene) {
    document.body.textContent = `Unknown shot: ${name}`;
    return;
  }
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best, 0, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let scoreBeforeLevel = 0;
  let muted = false;

  function announce(message) {
    status.textContent = message;
  }

  function startRun() {
    world.score = 0;
    world.time = 0;
    world.won = false;
    scoreBeforeLevel = 0;
    loadLevel(world, 0);
    screen = SCREEN_PLAY;
    announce('Heist 1 of 3: The Gilded Vault. Grab all 6 loot, then reach the exit.');
  }

  function retryLevel() {
    world.score = scoreBeforeLevel;
    loadLevel(world, world.levelIndex);
    screen = SCREEN_PLAY;
    announce(`Retrying ${['The Gilded Vault', 'Neon Casino', 'Midnight Museum'][world.levelIndex]}.`);
  }

  function advanceLevel() {
    scoreBeforeLevel = world.score;
    nextLevel(world);
    screen = SCREEN_PLAY;
    announce(`Heist ${world.levelIndex + 1} of 3. Grab all the loot, then reach the exit.`);
  }

  function handleEvents(events) {
    if (events & EVENT_LOOT) {
      audio.loot();
      renderer.burst(world.player.x, world.player.y, '#ffd65a', 12);
    }
    if (events & EVENT_SPOTTED) {
      audio.spotted();
      renderer.spotFlash();
      renderer.shake(0.45);
    }
    if (events & EVENT_LOCKDOWN) {
      audio.lockdown();
      renderer.shake(0.9);
      announce('Lockdown! Every guard is coming for you.');
    }
    if (events & EVENT_CAUGHT) {
      audio.caught();
      renderer.shake(1);
      screen = SCREEN_OVER;
      announce(`Busted in heist ${world.levelIndex + 1}. Press Space to retry.`);
    } else if (events & EVENT_WIN) {
      audio.cleared();
      if (world.score > best) {
        best = world.score;
        saveBest(best);
      }
      screen = SCREEN_WIN;
      announce(`All three heists done! Final score ${world.score}.`);
    } else if (events & EVENT_LEVEL_DONE) {
      audio.cleared();
      screen = SCREEN_LEVEL_DONE;
      announce('Clean getaway! Press Space for the next heist.');
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      muted = audio.toggleMute();
    }
    if (actions & ACTION_RESTART && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_OVER)) {
      retryLevel();
      return;
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      audio.click();
      if (screen === SCREEN_TITLE) startRun();
      else if (screen === SCREEN_OVER) retryLevel();
      else if (screen === SCREEN_LEVEL_DONE) advanceLevel();
      else if (screen === SCREEN_WIN) startRun();
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    const click = input.takeClick();
    if (click && screen === SCREEN_TITLE) {
      audio.unlock();
      startRun();
    } else if (click && (screen === SCREEN_OVER || screen === SCREEN_LEVEL_DONE || screen === SCREEN_WIN)) {
      audio.unlock();
      if (screen === SCREEN_OVER) retryLevel();
      else if (screen === SCREEN_LEVEL_DONE) advanceLevel();
      else startRun();
    }
  }

  function step() {
    if (screen !== SCREEN_PLAY) return;
    const dir = input.direction();
    const events = stepWorld(world, STEP, dir);
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE) {
      // Idle drift behind the title: guards keep patrolling the vault.
      stepWorld(world, STEP, { x: 0, y: 0, sneak: false });
      world.alarm = 12;
      world.seenNow = false;
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best, STEP, muted);
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Gilded Vault. Press Space or click to start the first heist.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
