# Dependencies

[Wiki home](../README.md) · [Security](../07-quality-and-security/security.md)

Versions and "latest" as observed on 2026-11-26 with `npm ls` and `npm outdated`.

## Runtime

| Package | Installed | Latest seen | Use |
|---|---|---|---|
| react, react-dom | 18.3.1 | 19.3.1 | UI |
| lucide-react | 0.460.0 | 1.81.0 | Icons |

## Development

| Package | Installed | Latest seen | Use |
|---|---|---|---|
| vite | 6.4.6 | 8.4.0 | Build and dev server |
| @vitejs/plugin-react | 4.7.0 | 6.3.0 | React support |
| tailwindcss, @tailwindcss/vite | 4.3.5 | | Styling |
| vitest | 3.2.7 | 5.1.2 | Unit tests (has audit advisories) |
| jsdom | 31.0.1 | | Test DOM |
| @testing-library/react | 16.3.3 | | Hook tests |
| @playwright/test | 1.65.1 | | Browser tests |
| @axe-core/playwright | 4.14.0 | 4.14.1 | Accessibility scans |

Major upgrades may contain breaking changes; upgrade one at a time and run the full suite.
