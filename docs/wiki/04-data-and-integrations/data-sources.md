# Data sources

[Wiki home](../README.md) · [API reference](api-reference.md) · [Error handling](error-handling.md)

## What comes from where

| Data | Provider |
|---|---|
| Fixtures, results, live scores | ESPN team schedule and match summary |
| League standings | ESPN standings |
| Squad, availability, season totals | ESPN roster |
| Player statistics, national-team history | ESPN athlete endpoints |
| Team summary | ESPN team (optional) |
| Competition names | Mapped in `parsers.js` from ESPN league slugs |
| Arsenal news | RSS: BBC Sport, Sky Sports, The Athletic, The Guardian, football.london, Arseblog, r/Gunners; plus ESPN news |
| Premier League and Champions League news | ESPN news |
| Player photos | ESPN headshot, else Wikipedia |
| Transfer target details | ESPN search and athlete profile |
| History | Static, curated in the repository |
| Fonts | Google Fonts |
| Crests and article images | Loaded directly from the provider or publisher CDNs |

## Nature of these services

- **No API key, account or payment** is used for any of them.
- The ESPN endpoints are public but, as far as this repository shows, **not a documented, supported API**. They can change or disappear without notice.
- **Terms of use** of each provider have not been reviewed as part of this documentation. Review them before any wider or commercial use.
- Team ids: men `359`, women `19973`.

## Not provided by these sources

Minutes, xG/xA, passing and defensive statistics, captain, injury return dates, and an official Arsenal.com feed.
