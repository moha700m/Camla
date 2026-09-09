# CAMEL RUSH 966

CAMEL RUSH 966 is a Saudi-born, vertical TikTok LIVE race. Viewers join
with a follow or the Arabic command `ادخل`, choose one of five original camel
lanes, and use gifts, likes, and shares to push the race forward.

The game is an overlay first: the live scene stays readable at 1080 × 1920,
races loop automatically, and a winner rolls into a short podium before the
next race begins.

## What is real

- `tiktok-live-connector` reads a public TikTok LIVE room from the local bridge.
- Follow, chat, gift, like, share, and viewer-count events are normalized before
  the game sees them.
- Gift values are converted into boosts by the race engine; no password or
  cookies are requested.
- The `/play` page is a clean browser-source overlay. `?demo=1` is only for
  local testing and is never required for a real stream.

The connector is an unofficial reverse-engineered integration. TikTok can
change or rate-limit its public webcast endpoints, so the dashboard exposes a
clear reconnecting/offline state instead of pretending a connection succeeded.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
# Set TIKTOK_UNIQUE_ID to the creator who is currently LIVE.
npm start
```

Open `http://127.0.0.1:3000`. Enter the LIVE creator's handle, click **اتصل
بالبث**, then copy the generated `/play?id=...` URL into TikTok LIVE Studio as
a Browser Source. Use 1080 × 1920, transparent background, and keep the local
bridge running on the same computer while streaming.

For a visual smoke test without TikTok:

```text
http://127.0.0.1:3000/play?demo=1
```

The test controls appear only on that URL. They exercise the same race engine
used by the real bridge.

## TikTok LIVE Studio setup

1. Start a public LIVE from the creator account.
2. Start this project with `npm start` and connect the creator handle in the
   dashboard.
3. Add a Browser Source in TikTok LIVE Studio using the generated `/play` URL.
4. Set width `1080`, height `1920`, and fit the source to the vertical scene.
5. Keep the terminal running; it is the local event bridge. The browser source
   displays **TikTok LIVE** only after the bridge receives a real connection.

See [`docs/TIKTOK_LIVE_STUDIO.md`](docs/TIKTOK_LIVE_STUDIO.md) for the full
capture checklist and troubleshooting.

## Game rules

| Interaction | Result |
| --- | --- |
| Follow or `ادخل` | Viewer joins a stable camel lane |
| `1`–`5` or a lane name | Join that lane and give it a small chat boost |
| Small gift | Small personal boost |
| Medium gift | Stronger personal boost |
| Large gift | Rocket-style boost and gold effect |
| Like milestone | Community speed burst |
| Share | Community hype |

The final 15 seconds close new entries and queue late viewers for the next
round. A round ends on the finish line or the timer, shows the top three for a
few seconds, then restarts automatically.

## Project map

```text
src/server.js                         Express + Socket.IO local bridge
src/services/TikTokService.js        connection/reconnect/event routing
src/lib/tiktokEventNormalizer.js      connector payload normalizer
public/index.html                     Arabic-first setup dashboard
public/play                           vertical capture route (alias)
public/games/camel-rush/              canvas renderer + race engine
public/lib/tiktok-bridge.js           browser event bridge
docs/ART_DIRECTION.md                 visual north star and performance budget
docs/TIKTOK_LIVE_STUDIO.md            capture instructions
test/                                 engine and normalizer tests
```

## Checks

```bash
npm run check
npm test
```

The app is intentionally local-first for TikTok: Vercel can host the static
marketing page, but the long-lived TikTok listener belongs on the creator's
machine or a persistent Node service, not a serverless function. A Render
Blueprint is included in `render.yaml` for a paid always-on Node service; set
`TIKTOK_UNIQUE_ID` and `WEB_ORIGIN` in Render before using its `/play` URL.

## Reference

The initial bridge shape was evaluated against the public
[TikTok Live Games](https://github.com/vamnguyen/tiktok-live-games) project.
CAMEL RUSH's game identity, rules, canvas scene, Arabic dashboard, and live
flow are its own implementation.
