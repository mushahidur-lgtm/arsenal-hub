# Environment configuration

[Wiki home](../README.md) · [Configuration reference](../08-reference/configuration-reference.md)

**The application needs no environment variables or secrets.** No `.env` file exists, and no workflow reads a repository secret.

| Variable | Used by | Meaning |
|---|---|---|
| `import.meta.env.DEV` | `net.js` (set by Vite) | Adds the local `/__proxy` fallback in development |
| `CI` | `playwright.config.js` | Retries, reporter, no server reuse |
| `AUDIT_BASE`, `AUDIT_OUT` | `playwright.audit.config.js`, audits | Target site and screenshot folder |
| `TZ` | unit test set-up | Pinned to UTC |

Anything shipped to the browser is public. If a future provider needs a key, it must not be placed in client code or in a `VITE_` variable; it needs a server-side proxy.
