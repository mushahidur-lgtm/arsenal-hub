# Security Policy

## Supported Versions

Arsenal Hub is currently maintained as a public static web application. Security fixes are provided for the latest version on the `main` branch.

| Version | Supported |
| --- | --- |
| Latest version on `main` | :white_check_mark: |
| Older commits and snapshots | :x: |

This project does not currently publish versioned releases. If versioned releases are introduced, this table will be updated.

## Reporting a Vulnerability

Please help keep Arsenal Hub and its users safe by reporting suspected security vulnerabilities privately.

**Do not report security vulnerabilities through public GitHub issues, discussions, pull requests, or other public channels.** Public reports can expose users before a fix is available.

### How to report

1. Open the repository's **Security** tab on GitHub and use **Report a vulnerability** to submit a private vulnerability report, if that option is available.
2. If private vulnerability reporting is unavailable, contact the repository maintainer privately through the contact options on their GitHub profile: https://github.com/mushahidur-lgtm

Please include, where possible:

- A clear description of the suspected vulnerability and its potential impact.
- The affected page, component, file, or commit.
- Reproduction steps or a minimal proof of concept.
- Any relevant screenshots, logs, or request details. Remove passwords, tokens, personal information, and other secrets before sharing.

### What to expect

- **Acknowledgement:** We aim to acknowledge a report within 5 business days.
- **Assessment:** We will investigate the report, determine its impact and affected versions, and may ask for additional information.
- **Updates:** We aim to provide a meaningful status update at least every 10 business days while the report is being investigated.
- **If accepted:** We will work on a fix, validate it, and coordinate a reasonable disclosure timeline with the reporter. The fix and any relevant security notice may be published in the repository.
- **If declined:** We will explain why the report is not considered a security vulnerability or is outside the project's scope, where we can do so.

These are response targets, not guaranteed deadlines. Resolution time depends on severity, complexity, and maintainer availability.

### Scope and responsible disclosure

Arsenal Hub is currently a static client-side application hosted through GitHub Pages. It does not provide user accounts, a private database, or a project-operated application backend. Reports involving the application, its repository, build and deployment workflows, dependencies, or handling of data loaded by the application are in scope.

Please:

- Allow reasonable time for investigation and remediation before disclosing a vulnerability publicly.
- Do not access, modify, or delete data that is not yours.
- Do not conduct denial-of-service tests, spam, social engineering, or tests that disrupt GitHub, data providers, proxy services, or other third-party infrastructure.
- Do not include real users' personal information or live secrets in a proof of concept.

This policy applies to Arsenal Hub only. Third-party services, APIs, data providers, hosting platforms, and proxy services have their own security reporting processes; please report vulnerabilities in those services to their respective owners.

Thank you for helping improve the security of Arsenal Hub.
