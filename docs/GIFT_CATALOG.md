# Gift rules for CAMEL RUSH 966

Gift names and coin values can vary by country, account, and TikTok product
update. The game therefore uses the connector's normalized `giftValue` and
does not hardcode a full platform catalog.

## Default gameplay tiers

| Normalized value | Visual effect | Default boost |
| --- | --- | ---: |
| 1–9 diamonds | cyan dust burst | 2.5 progress |
| 10–99 diamonds | gold boost ring | 6 progress |
| 100+ diamonds | rocket / gold trail | 12 progress |

The value is multiplied by at most five repeat-count steps so a gift streak
cannot move a lane by an unlimited amount in one event. The race engine still
uses timing, the final rush, and community boosts, so spend is an advantage,
not a guaranteed win.

## Finding a creator's gift payloads

Open `/debug.html`, connect to the live creator, and send a test gift. The
debugger shows the normalized name, value, and repeat count. Use that output
when tuning rules; do not assume a gift name or coin value from a different
region.
