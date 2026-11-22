// Gilded Vault — shared constants for the top-down heist game.
// Canvas is 1280x720. The top 80 px are the HUD strip; the playfield below
// it is a 20x10 grid of 64 px tiles (1280x640).
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 80;
export const TILE = 64;
export const COLS = 20;
export const ROWS = 10;
export const FIELD_W = COLS * TILE;
export const FIELD_H = ROWS * TILE;

export const STEP = 1 / 60;
export const BEST_KEY = 'gilded-vault-best';

// Movement (px per second).
export const PLAYER_SPEED = 168;
export const SNEAK_SPEED = 88;
export const GUARD_PATROL_SPEED = 72;
export const GUARD_CHASE_SPEED = 152;
export const GUARD_SEARCH_SPEED = 95;

// Vision.
export const GUARD_RANGE = 230;
export const GUARD_HALF_ANGLE = 0.61; // ~35 degrees each side
export const CAMERA_RANGE = 270;
export const CAMERA_HALF_ANGLE = 0.5;
export const CATCH_RADIUS = 26;

// Alarm meter 0..100.
export const ALARM_SEEN_RATE = 34; // per second while any observer sees the thief
export const ALARM_SNEAK_FACTOR = 0.45; // sneaking fills the meter slower
export const ALARM_DECAY = 7; // per second while unseen
export const ALARM_LOCKDOWN = 100;

// Scoring.
export const GHOST_BONUS = 500; // finishing a heist with alarm never over 50
export const TIME_BONUS_PER_SEC = 10; // remaining par time pays out
export const PAR_SECONDS = 150;
