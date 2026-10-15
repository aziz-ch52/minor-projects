# Pocket Tanks

A lightweight browser-based 2D artillery game inspired by classic tank battle games. The project is built as a plain HTML5 canvas game with modular JavaScript, featuring turn-based shooting, dynamic terrain, weapons, wind simulation, and score tracking.

## Features

- 2-player turn-based combat
- Angle and power aiming system
- Wind effect on projectile movement
- Destructible terrain with craters and mounds
- Multiple weapons:
  - Standard Shell
  - MIRV Splitter
  - Bunker Builder
- Player HP, score, and match-over logic
- Keyboard controls and drag-to-aim input
- Responsive HUD and canvas-based UI

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Canvas API
- ES Modules

## Project Structure

- index.html — game shell and HUD layout
- css/style.css — interface styling and HUD presentation
- js/main.js — main game loop, state updates, rendering, input wiring
- js/engine/GameContext.js — turn order, match state, wind, scoring
- js/engine/InputHandler.js — keyboard and pointer input handling
- js/engine/Physics.js — gravity, wind, collision, blast damage
- js/entities/Tank.js — player tank logic, health, aiming, rendering
- js/entities/Projectile.js — projectile creation and weapon behaviors
- js/entities/Particle.js — explosion, dust, and puff effects
- js/environment/Terrain.js — procedural terrain generation and destruction rules
- build.py — bundles the project into a single-file playable version
- play.html — generated standalone build for offline use

## Gameplay Loop

The game runs in a fixed-step update loop:

1. Player aims angle and power
2. Weapon is selected and fired
3. Projectiles are updated with gravity and wind
4. Collisions with terrain or enemy tanks trigger damage and explosions
5. Turns advance until one tank is eliminated or the match ends

## Design Notes

This project follows a simple ECS-like but lightweight architecture:

- Entities are represented as plain JavaScript classes
- World state is centralized in a game context
- Physics and terrain operations are kept separate from rendering
- Effects are handled through a particle system for smooth visual feedback

## Run

Open index.html in a browser, or run the bundled version in play.html.

## Purpose

This project is a compact demonstration of a classic artillery game implemented using pure web technologies without frameworks or dependencies.
