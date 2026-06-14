# Plinko / Galton Board — Normal Distribution Emergence

Demonstrates the Central Limit Theorem: particles dropped through a staggered peg grid naturally form a normal (bell-curve) distribution in the buckets below.

## Physics
- All particle data in a flat Float32Array (stride 8: x, y, vx, vy, state, freeze_timer, stuck_timer, bucket)
- Euler integration with 3 substeps per frame for stability
- Three states: Active (peg collisions) → Settling (bucket physics) → Frozen (static stack)
- Spatial hash for efficient frozen-stack collision queries

## Rendering
- Three.js WebGL (three.module.js) — matches Phase Transitions project style
- Instanced mesh for particles (single draw call)
- Instanced mesh for pegs
- Histogram bars rebuilt every 8 frames with cool→warm vertex colors
- Ghost normal curve overlay as CLT reference

## Controls (lil-gui)
- Drop Rate (particles/sec)
- Gravity
- Peg Rows
- Damping
- Max Particles
- Clear button
