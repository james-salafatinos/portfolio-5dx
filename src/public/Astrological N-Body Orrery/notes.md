# Astrological N-Body Orrery

A real-time **n-body gravitational simulation** of the solar system rendered with Three.js, with an astrological overlay.

## Physics

The simulation uses **Velocity Verlet integration** — the same algorithm as the other n-body demos on this site — but initialized from real planetary orbital elements:

- Semi-major axes, eccentricities, and inclinations from NASA JPL data
- Kepler's equation solved iteratively (15 Newton-Raphson steps) to convert mean anomaly → eccentric anomaly → Cartesian position
- Vis-viva equation for initial orbital velocities
- G = 4π² in Gaussian gravitational units (1 AU, 1 solar mass, 1 year)
- Softened gravity (ε = 0.5 AU) prevents singularities at close approaches
- Full N×N pairwise force computation — every body pulls on every other body

## Astrology Layer

Each planet has its traditional astrological rulership and meaning. The zodiac belt (30° divisions) is rendered at ~48 AU radius. Click any body to see:
- Zodiac sign rulership
- Mythological / psychological meaning
- Live orbital velocity and semi-major axis

## Controls

- **Drag** — orbit camera
- **Scroll** — zoom
- **Click any body** — info panel
- **Time Scale** (GUI) — 0× to 10×
- **Trails** — toggle orbital trail lines
- **Zodiac Belt** — toggle the outer ring

## Notes

Outer planet orbital periods at real scale would require millions of frames to see, so semi-major axes are compressed (1 unit ≈ 1 AU, but visual scale is adjusted). The simulation remains gravitationally self-consistent — Jupiter's mass visibly perturbs Saturn and the inner planets over long timescales.
