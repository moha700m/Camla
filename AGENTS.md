# CAMEL RUSH 966 contributor guide

This repository is the Saudi-born CAMEL RUSH 966 vertical TikTok LIVE game.
Keep the overlay readable at 1080 × 1920 and preserve Arabic/English/emoji
usernames.

## Commands

```bash
npm run check
npm test
npm start
```

## Architecture

- `src/server.js` owns Express and Socket.IO.
- `src/services/TikTokService.js` is the only TikTok connector boundary.
- `src/lib/tiktokEventNormalizer.js` converts connector payloads into stable
  internal events.
- `public/lib/tiktok-bridge.js` is the browser-side event bridge.
- `public/games/camel-rush/race-engine.js` is deterministic game state; keep
  rendering and provider details out of it.
- `public/games/camel-rush/game.js` renders the vertical canvas and HUD.

## Rules

- Never commit `.env` or credentials.
- Do not ask for TikTok passwords or cookies.
- Do not put a long-lived TikTok listener in a Vercel serverless function.
- Keep the normalized Socket.IO event names stable: `tiktok_chat`,
  `tiktok_gift`, `tiktok_like`, `tiktok_share`, `tiktok_follow`,
  `tiktok_member`, `tiktok_connected`, `tiktok_status`,
  `tiktok_reconnecting`, `tiktok_disconnected`, and `tiktok_error`.
- Any new gift mapping belongs in the race rules/config, not in the canvas
  renderer.
- Run `npm run check` and `npm test` before committing.
