# City Highway Racer

A cartoonish bird-view highway driving game built with **TypeScript** and **HTML5 Canvas**.

## Features

- Startup screen, fail screen, and result screen.
- In-game end/escape control for abandoning a started drive and returning to the startup screen.
- Separate Music and Sound toggle buttons, available from the startup screen and in-game screens.
- Arrow-key / WASD driving controls, plus touch controls for phones and tablets.
- Accelerate, decelerate, and steer freely across lanes.
- Multiple vehicle types: cars, pickups, trucks, buses, and motorcycles.
- Easier early levels with slower traffic, fewer obstacles, and longer reaction time.
- Safe passing feedback: overtaken vehicles are labeled and award a passing bonus.
- Stronger motion graphics with lane markers, speed streaks, road texture, and shoulder strips scrolling from top to bottom across all lanes.
- Traffic vehicles now avoid each other by braking or steering into safe adjacent lanes.
- If two traffic vehicles still collide, they are replaced by a damaged multi-vehicle accident scene using the actual vehicle types and colors involved.
- Road hazards: large pits and accident scenes with tighter touch-based collision detection.
- Falling cargo crates that grant 10-500 bonus points and play a pickup sound.
- Crash sound on player collisions and nearby traffic accidents.
- Background music support through a Pixabay MP3 file, plus a softer synthesized fallback loop.
- Sound effects can be muted independently from background music.
- Randomly changing minimum and maximum speed limits.
- Speed-limit violations no longer fail the level immediately: after 5 continuous seconds over/under the allowed range, the player loses 1 point every second until the speed is corrected.
- Large top-screen speed warning banner when the player is outside the speed range.
- Score, speed, time, safe passes, route, and level progress HUD.
- Faster city-to-city completion grants a larger result-screen bonus.
- Trees, buildings, signs, and roadside scenery following the supplied cartoon theme.
- Responsive page layout that scales the 16:9 game canvas to desktop, tablet, and mobile screens.

## Run locally

The compiled JavaScript is already included in `dist`, so you can run the game immediately:

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

To rebuild the TypeScript after editing:

```bash
npm run build
npm start
```

No npm packages are required. The server uses Node.js built-in modules only.

## Controls

Keyboard / desktop:

- `Up Arrow` or `W`: Accelerate
- `Down Arrow` or `S`: Decelerate
- `Left Arrow` or `A`: Steer left
- `Right Arrow` or `D`: Steer right
- `Enter`, `Space`, or click: Start / continue / retry
- `Escape`: End the current drive during gameplay, or return from fail/result screen to startup screen
- `M`: Toggle background music on/off
- `N`: Toggle sound effects on/off

Touch screens:

- `GO`: Accelerate
- `BRAKE`: Decelerate
- `←` and `→`: Steer left/right
- On-screen `Music`, `Sound`, and in-game `END` buttons can be tapped directly.

The touch buttons appear automatically during gameplay on phones, tablets, and other coarse-pointer devices. Landscape mode is recommended for small phones.

## Background music from Pixabay

The game expects the music file here:

```text
assets/music/background.mp3
```

Recommended energetic Pixabay track:

- **The Race Is On - racing soundtrack videogame instrumental** by **melodyayresgriffiths**
- https://pixabay.com/music/video-games-the-race-is-on-racing-soundtrack-videogame-instrumental-378331/

Backup option if you prefer an 80s/synthwave feel:

- **Asphalt Superstar - racing outrun synthwave retro video game** by **melodyayresgriffiths**
- https://pixabay.com/music/video-games-asphalt-superstar-racing-outrun-synthwave-retro-video-game-158965/

Download one MP3 from Pixabay, rename it to `background.mp3`, and place it inside `assets/music/`. Until that file is added, the game uses a lightweight synthesized fallback loop so audio still works.

## Project structure

```text
src/core       Game loop, input, audio, scene contract
src/entities   Player, traffic, cargo, obstacle entities
src/systems    Spawning, traffic AI, collisions, speed-limit rules
src/rendering  Road, vehicle, obstacle, UI drawing helpers
src/scenes     Startup, gameplay, fail, result screens
src/config     Game constants and generated level definitions
src/utils      Math and deterministic random helpers
```

## Design notes

The implementation keeps gameplay responsibilities separated: scenes coordinate flow, systems update rules, renderers draw visuals, and entities hold state. Collision detection uses compact contact shapes that match the visible vehicle and obstacle bodies instead of large padded rectangles. Traffic coordination is separated from spawning, so vehicles can choose safe lane changes, brake behind slower traffic, and create persistent accident hazards only when a collision actually occurs.
