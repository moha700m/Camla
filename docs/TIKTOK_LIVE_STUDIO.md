# TikTok LIVE Studio — CAMEL RUSH 966

CAMEL RUSH uses a local Node bridge because TikTok events arrive over a
long-lived connection. The Browser Source only renders the game; it does not
need a TikTok password or cookies.

## Start a real session

1. Open a terminal in the project folder.
2. Run `npm install` once, then `npm start` for every stream.
3. Open `http://127.0.0.1:3000` in the same computer's browser.
4. Start a public TikTok LIVE from the creator account. The handle must be
   entered without `@` (for example `mgz7o2`).
5. Enter the handle in the dashboard and select **اتصل بالبث**.
6. Wait until the dashboard says that the connection succeeded. If it says
   reconnecting, keep LIVE open; the bridge retries automatically.
7. Copy the generated `/play?id=...` URL.

## Add the game to LIVE Studio

1. Add a **Browser Source** (or web source) to the vertical scene.
2. Paste the generated URL.
3. Set width to `1080` and height to `1920`.
4. Keep the source at its native aspect ratio and fit it inside the vertical
   canvas. Do not crop the bottom HUD.
5. Start the stream. The red status pill changes to **TikTok LIVE** only after
   the local bridge has a real room connection.

Recommended capture settings:

- Browser source FPS: 30 or 60, matching the stream scene.
- Hardware acceleration: on.
- Browser source audio: off (the first release has no required music track).
- Hide the browser cursor and keep the terminal running in the background.

## Viewer interactions

| TikTok event | In-game result |
| --- | --- |
| Follow | Viewer is assigned to a stable camel lane |
| Chat `ادخل` / `join` | Viewer joins the race |
| Chat `1`–`5` or a camel name | Lane selection plus a small boost |
| Rose / small gift | Personal speed boost |
| Medium gift | Stronger speed boost |
| Large gift | Rocket boost and gold effect |
| Like milestone | All lanes get a community burst |
| Share | Hype effect for everyone |

The exact gift value is read from the connector event and converted to a
small, medium, or large boost. No gift is a guaranteed win; the race also has
timers, a final rush, and catch-up through likes.

## Troubleshooting

### Status stays “غير متصل”

- Confirm `npm start` is still running.
- Confirm the creator is currently LIVE and the handle is spelled correctly.
- Open `http://127.0.0.1:3000/api/health` and check `status` and `lastError`.
- Do not use `?demo=1` for a real stream; it deliberately shows local test
  buttons and marks the overlay as connected without TikTok.

### Status says “جاري الربط”

The listener is retrying. Leave the public LIVE running for a few seconds and
watch the terminal for the connector message. TikTok may rate-limit or change
its unofficial webcast endpoint; the game remains playable while the bridge
reconnects.

### Events arrive in the debugger but not the overlay

Open the generated URL from the same local server (not a downloaded HTML file),
and ensure it contains `?id=<handle>`. A browser source cannot reach a bridge
that is running on another computer unless a secure, reachable server URL is
provided with `&server=https://...`.

## Local smoke test

Use `/play?demo=1` before going LIVE. Click the test buttons and confirm that a
camel moves, a viewer name appears above it, the final rush and podium display,
and the next race starts without a manual reset.
