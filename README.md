![header](assets/header.png)
# cellular automata
A web-based simulation of different variations of Cellular Automata

## Features to add
### 🔧 Simulation Controls
- Custom rules editor (users define survival/birth rules, e.g. Life-like automata, Wolfram rules).
- ~~Randomized initial states (seeded randomness for reproducibility)~~.
- Step backward / undo (navigate history easily).
- ~~Variable neighborhood sizes (Moore, Von Neumann, Hex grids)~~.
- ~~Toroidal / bounded edges (wrap-around vs finite world)~~.
- ~~Add infinite grid using chunked rendering.(i32 limits:(-2147483648, 2147483647))~~
- Adjustable simulation speed (slow-motion vs. fast-forward).
- Multi-layered grids (stacked CA worlds that interact).

### Performance Changes
- ~~instead of multiple loops, create new grid and swap, (improve step speed)~~(fixed rendering speeds, actual GOL maybe improved).
- track changing cells, and then change only them

### 🎨 Visualization
- ~~Different grid geometries (hexagons, triangles, squares)~~.
- ~~Zoom & pan (explore large universes)~~.
- Cell color mapping (e.g. intensity by age, energy, state type).
- Thematic skins (e.g. “organic” mode, “digital pixels” mode).
- Heat maps (activity, population density, entropy).

### 📊 Analysis
- ~~Population statistics graph (live count of alive cells)~~.
- Entropy measure (how chaotic the system is over time).
- Pattern recognizer (detect gliders, oscillators, still lifes).
- Stability detector (detect when the system freezes or loops).
- Cycle detection (recognize repeating states).
- ~~Pattern comparison (export/import and compare runs)~~.
- ~~Display stats and visualize them with graphs~~
### 🌍 Advanced Features
- Multi-species interactions (predator-prey, competing organisms).
- Rule evolution (rules mutate over time → evolutionary CA).
- Energy & resource fields (cells consume/regenerate resources).
- User interaction (add/remove cells live during simulation).
- Export / import state (JSON, image snapshots, animated GIFs).
- Procedural terrain generation (CA as a map generator).
- Integration with physics-like systems (diffusion, flow, heat transfer).


