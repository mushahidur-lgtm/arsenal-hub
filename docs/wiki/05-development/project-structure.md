# Project structure

[Wiki home](../README.md) · [Application structure](../02-architecture/application-structure.md) · [File index](../08-reference/file-and-component-index.md)

```text
arsenal-hub/
├── index.html                 HTML entry, fonts, social meta tags
├── vite.config.js             base path, React and Tailwind plugins, dev proxy
├── vitest.config.js           unit test setup
├── playwright.config.js       e2e tests (builds and previews the app)
├── playwright.audit.config.js screenshot and live-site audits
├── package.json
├── public/                    favicon.svg, og-image.png (copied as is)
├── src/
│   ├── main.jsx, App.jsx, index.css
│   ├── components/            pages and shared UI
│   └── lib/                   data, parsing and domain logic
├── tests/
│   ├── unit/                  Vitest
│   ├── e2e/                   Playwright specs, support.js, recorded fixtures
│   └── audit/                 visual and live-site audits
├── .github/workflows/         ci.yml, deploy.yml
├── docs/wiki/                 this documentation
└── CLAUDE.md                  instructions for Claude Code (untracked at the time of writing)
```

Generated and ignored by Git: `node_modules/`, `dist/`, `test-results/`, `playwright-report/`, `coverage/`, `audit/`.
