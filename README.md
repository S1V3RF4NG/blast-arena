# Blast Arena

A 2–4 player, room-code multiplayer Bomberman-style browser game.

## Publish on Netlify (drag & drop)
1. Create a new site in Netlify and drag `netlify-ready-game.zip` into the deploy drop zone.
2. Netlify deploys the static root and the bundled `netlify/functions/game.js` function.
3. Netlify Blobs is provisioned automatically on first use. No environment variables are required.
4. Share the deployed URL. One player creates a room and shares the 4-letter code.

For local development, run `npm install`, then `npx netlify dev`. The API is `/.netlify/functions/game`.

## Controls
- Desktop: WASD / arrow keys; Space places a bomb.
- Mobile: on-screen D-pad and BOMB button.
- The browser unlocks generated chiptune audio on the first tap/click. Music and SFX have independent toggles.

## Technical notes
- Root `netlify.toml` publishes `.` and points functions to `netlify/functions`.
- `netlify/functions/game.js` uses the `@netlify/blobs` site store with `consistency: "strong"`, `onlyIfNew` for room-code creation, and ETag-guarded `onlyIfMatch` writes for room updates.
- `lib/game-core.js` is shared by the function and local simulation test.
- State is authoritative on the server; clients poll the function for updates.

## Verification
Run `npm test` for a deterministic three-round, two-player scoring/final-winner simulation. Run `npm run build` for JavaScript syntax checks.

## Storage/concurrency scope
Netlify Blobs is a key/value store, not a transactional database. This build uses strong reads and ETag conditional writes as requested to reduce stale room updates. It is intended for casual small-room play; for high-contention competitive play or guaranteed transactional ordering across simultaneous inputs, move the authoritative game state to a transactional realtime datastore.
