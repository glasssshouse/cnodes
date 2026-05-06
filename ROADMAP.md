# cnodes Roadmap

## Completed

- Base project setup with TypeScript, Vite, Vitest, ESLint, and Prettier
- Canvas mounting through `CanvasGraph`
- Fluent node creation with chainable builder methods
- Static node rendering for `rect` and `circle`
- DPR-aware canvas rendering
- Title and description rendering
- Node geometry with `.size(width, height)`
- Text fitting and truncation for titles and descriptions
- Connection model and rendering
- Visual polish and fixed end arrowheads
- Packet visualization
- Node dragging with live redraw
- Node hover and dragging
- Graph-level connection line style with optional bezier rendering
- Configurable connection stroke style with solid default and optional animation
- Richer connection stroke variants such as dotted and animated-dotted
- Wrapped node titles and descriptions with real rect height auto-growth
- Layout persistence for dragged node positions across reloads
- Multi-hop packet routing with shortest-path traversal
- Per-connection line, stroke, color, and arrow styling
- Node theming and graph-wide visual palettes
- Auto visible ports and endpoint styling
- Connection labels
- Packet styling and trails
- Per-send packet styling
- Packet receive highlights for important sends
- Transport-agnostic inbound graph actions for external event streams
- Packet routing through required waypoint nodes
- Named ports and connect-to-specific-port API
- Release preparation script and CI workflow improvements
- Release Please automation for changelog and release pull requests
- Documentation and usage examples

## Next

- Packet payload model for sent packets and graph actions

## Later

- Additional decorative connection treatments

## Rules

- Update this file in the same change as feature work
- Keep exactly one concrete item in `Next`
- Move completed work from `Next` to `Completed`
- Keep `Later` high level and non-exhaustive
