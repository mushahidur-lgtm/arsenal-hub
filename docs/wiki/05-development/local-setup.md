# Local setup

[Wiki home](../README.md) · [Prerequisites](prerequisites.md) · [Testing](testing.md) · [Troubleshooting](troubleshooting.md)

## Contents

- [Clone and install](#clone-and-install)
- [Run](#run)
- [Test](#test)
- [Build and preview](#build-and-preview)
- [Linting and type checking](#linting-and-type-checking)
- [Environment setup](#environment-setup)

## Clone and install

```bash
git clone https://github.com/mushahidur-lgtm/arsenal-hub.git
cd arsenal-hub
npm ci
```

Use `npm ci` for a clean install from the lock file, or `npm install` when changing dependencies.

## Run

```bash
npm run dev
```

Open the URL Vite prints, with the `/arsenal-hub/` path (by default `http://localhost:5173/arsenal-hub/`). The dev server fetches **live** data and provides the `/__proxy` route for providers without CORS headers.

## Test

```bash
npm test
```

```bash
npx playwright install
```

```bash
npm run test:e2e
```

Quicker, Chromium only:

```bash
npm run test:e2e:chromium
```

Watch mode for unit tests: `npm run test:watch`. Details: [Testing](testing.md).

## Build and preview

```bash
npm run build
```

```bash
npm run preview
```

The build goes to `dist/`. Preview serves it (by default `http://localhost:4173/arsenal-hub/`).

| Mode | Command | Data | Proxy |
|---|---|---|---|
| Development | `npm run dev` | live | local `/__proxy` used |
| Preview | `npm run preview` | live | not used by the built app |
| Production | GitHub Pages | live | public proxies only |

## Linting and type checking

There is **no** lint script, linter configuration, TypeScript or type-check step. `npm run build` catches syntax and import errors only.

## Environment setup

Nothing to configure. See [Environment configuration](../06-deployment-and-operations/environment-configuration.md).
