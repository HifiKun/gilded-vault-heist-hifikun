# gilded-vault-heist-hifikun

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/HifiKun/gilded-vault-heist-hifikun/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/HifiKun/gilded-vault-heist-hifikun/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Gilded Vault — 3 Heists, 12 Guards, 9 Cameras, 21 Loot.** A top-down stealth
heist game for [make.fun's best-heist-game-20261122-0559 bounty](https://make.fun/bounty/best-heist-game-20261122-0559).

You are the thief. Three rooms stand between you and retirement:

1. **The Gilded Vault** — Meridian Bank after closing. 3 guards, 2 cameras, 6 gold bars.
2. **Neon Casino** — the Velvet Nine high-roller floor. 4 guards, 3 cameras, 7 chip stacks.
3. **Midnight Museum** — the Hall of Antiquities on gala night. 5 guards, 4 cameras, 8 relics.

## How to play

- **WASD / arrow keys** — move. **Shift** — sneak (slower, harder to spot).
- Walk over loot to grab it. Grab **all** the loot in a room to unlock its exit.
- Guards patrol waypoints; when one sees you it chases, and when it loses you
  it searches your last known position before returning to patrol. Cameras
  sweep back and forth and radio the nearest guard when they spot you.
- Being seen fills the **alarm meter**. At 100% the building goes into
  **lockdown** and every guard converges on you. Get caught and the heist
  is busted — retry the room.
- Finish a heist with the alarm never past 50% for a **Ghost bonus (+500)**,
  plus a time bonus against the room's par time.
- **P** pause, **M** mute, **R** restart the room. Mouse click also starts the game.

## Play it

```sh
node serve.ts   # serves game/ at http://localhost:8080
```

Open `game/index.html` in desktop Chrome — plain static files, no network
requests, no build step. Sound is synthesized with WebAudio; there are no
audio assets.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored `vendor/makefun-game.ts` library.

## Screenshots

Four staged renders of the game's own code (`?shot=title|vault|casino|museum`):

1. Title screen — the three heists at a glance.
2. The Gilded Vault mid-heist — guard cones, a camera, gold, alarm at 18%.
3. Neon Casino — sneaking past a chasing guard, alarm at 47%.
4. Midnight Museum — 7 of 8 relics taken, alarm at 82%, guards closing in.
