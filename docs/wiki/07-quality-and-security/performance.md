# Performance

[Wiki home](../README.md) · [Caching and refresh](../04-data-and-integrations/caching-and-refresh.md)

## Measured build output

Local build at the documented commit:

| File | Size | Gzip |
|---|---|---|
| main JavaScript | 367 kB | 115 kB |
| CSS | 56 kB | 11 kB |
| pitch chunk | 20 kB | 6 kB |
| analysis chunk | 12 kB | 4 kB |
| history chunk | 8 kB | 3 kB |

## In place

Lazy chunks for comparison, history and pitch; shared and cached requests (tests assert no duplicate URL on a normal visit); lazy images with the lead image prioritised; memoised story and transfer derivation; a bounded news archive.

## Not measured

- No Lighthouse or Web Vitals measurements.
- Re-render cost of the 30-second clock in `App`.
- Real-network load time on phones.

## Possible bottlenecks (unconfirmed)

Story clustering compares each article with existing clusters; many sequential provider calls when proxies are needed; third-party fonts and large publisher images.
