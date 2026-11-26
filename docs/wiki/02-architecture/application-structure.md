# Application structure

[Wiki home](../README.md) · [Component architecture](component-architecture.md) · [Project structure](../05-development/project-structure.md)

## Start-up sequence

1. `index.html` loads fonts and `src/main.jsx`.
2. `main.jsx` renders `<App>` inside `React.StrictMode` and imports `index.css`.
3. `useHubData` reads the saved cache from `localStorage` and shows it immediately, marked as cached.
4. One effect calls `refreshAll({ initial: true })`; a ref guard stops Strict Mode's double mount from fetching twice.
5. Each source updates its own state as it settles.
6. The women's sources are **lazy**: loaded when a women's page or search needs them.

## Module map

| Module group | Files |
|---|---|
| Shell | `src/App.jsx`, `src/main.jsx`, `src/index.css` |
| Pages | `src/components/{news,matches,pitch,squad,analysis,transfers,history}.jsx` |
| Shared UI | `src/components/ui.jsx` |
| Networking | `src/lib/{net,errors,cache,diagnostics}.js` |
| Parsing and validation | `src/lib/{parsers,feeds,validate}.js` |
| Data orchestration | `src/lib/{data,playerstats,refresh}.js` |
| Domain logic | `src/lib/{news,transfers,hero,standings,availability,pitch,sources,history}.js` |
| Utilities | `src/lib/{route,format,storage,lazy}.js` |

Per-file detail: [File and component index](../08-reference/file-and-component-index.md).

## Code splitting

`analysis.jsx`, `history.jsx` and `pitch.jsx` load on demand through `lazyRetry` (`src/lib/lazy.js`), which retries a failed download once. If it still fails, the error boundary offers **Reload page** (this covers an open tab whose chunk files were replaced by a new deploy).
