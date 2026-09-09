# CAMEL RUSH 966 — Art Direction

## Visual north star

CAMEL RUSH 966 is a premium, readable vertical livestream game. It should feel
like a night race in a futuristic Saudi desert festival: warm sand, deep navy,
emerald shade, cyan lights, and small gold moments reserved for leaders and
the finish.

The viewer must understand the loop immediately:

**Choose a camel → send a gift → push it forward → celebrate the winner.**

## World language

- Original camel silhouettes and geometry; no copied characters or game assets.
- Desert track with Najdi-inspired geometric gates, lanterns, palms, and distant
  city light bars. Architecture is abstract and modular, not a landmark replica.
- The world is atmospheric but never allowed to compete with the race lanes.
- Gold is an achievement color, not a background color.

## Color system

| Token | Value | Use |
| --- | --- | --- |
| Night | `#080E1A` | Base sky and safe contrast field |
| Ink | `#111B2E` | Panels, track depth, cards |
| Sand | `#C98955` | Dunes, track warmth, architecture |
| Cyan | `#52E0D0` | Live status, energy, interactive accents |
| Gold | `#FFD166` | Finish, leader, crowns, rewards |
| Coral | `#FF6B5E` | Alerts, sandstorm, danger |
| Cloud | `#F5F1E8` | Primary type |

## Scale and layout

- Reference capture: 1080 × 1920, 9:16.
- The race occupies approximately 68% of the vertical frame.
- Top HUD uses two compact rows; bottom interaction legend stays inside a
  64px safe area.
- Player and camel names are limited to one line with ellipsis.
- At 390px wide, lane labels remain readable without horizontal scrolling.

## Motion and feel

- Camels run with a four-beat leg cycle and a subtle body bob; never slide.
- Gifts produce immediate dust, sparks, and a short lane pulse.
- Final Rush intensifies the cyan/gold edge light and speed, without shaking the
  whole screen.
- Podium lasts 8 seconds, then the next race starts automatically.

## Performance budget

- One canvas and DOM HUD; no external textures in the first release.
- Target 60 FPS on a laptop and stable 30 FPS on weaker capture machines.
- No more than 60 transient particles and 5 animated camels.
- DPR is capped at 1.5 in the overlay to protect TikTok LIVE Studio capture.

## Asset naming

- `camel-rush-bg-*` — world backgrounds
- `camel-*` — player camel variants
- `fx-*` — particles, trails, event flashes
- `ui-*` — streamer HUD and badges

## Live event visual rules

- Rose / small gift: cyan dust burst and +1 boost.
- Medium gift: gold boost ring and +3 boost.
- Large gift: coral/gold rocket trail and +8 boost.
- Like milestones: full-field cyan pulse, never a blocking modal.
- Follow / join: small arrival toast; late joins are queued for the next race.
