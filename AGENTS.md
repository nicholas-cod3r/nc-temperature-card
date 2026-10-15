# AGENTS.md

Repository-specific implementation notes. `README.md` is the source of truth for user-facing behavior, options, installation, and development commands.

## Structure And Validation

- Card implementation lives in `src/*.ts` and uses Lit. Keep the browser loader in `src/preload.js` and Node tooling in `scripts/*.js`.
- `npm run build` type-checks the TypeScript source and bundles `src/index.ts` into `dist/`. Do not hand-edit generated files in `dist/`.
- Use `npm run typecheck` for a type-only check. There is no lint or test script; verify changes with `npm run typecheck` and `npm run build`.
- The package is ESM and requires Node `>=22`. Keep the URL-safe `package.json` name, custom element tag, `CARD_TYPE`, and HACS artifact name aligned; the package name also determines the build output and local resource directory.
- `setConfig` validates configuration and throws on invalid input. Preserve the entity ID validation in `src/config.ts`.
- Keep changes within this card. Do not register Lovelace resources, edit Home Assistant configuration, or modify other cards.

## Home Assistant Frontend

- Use the Lovelace-provided `hass` object for entity state, locale, and frontend WebSocket calls; do not hard-code Home Assistant endpoints or assume integration-specific entities.
- Keep card and editor custom-element registration idempotent. The editor uses HA selectors and emits `config-changed` as a bubbling, composed event.
- Use `hass.formatEntityState` for locale-aware entity values when available; open entity dialogs with the bubbling, composed `hass-more-info` event.
- Validate configuration in `setConfig`; YAML dashboards can bypass the visual editor.
- Keep editor strings in the locale dictionaries and use the existing language fallback.

## HACS Packaging

- HACS consumes the generated ESM bundle at `dist/<package-name>.js`; local installs use the preload loader and companion bundle. Keep their filenames and README instructions synchronized when changing packaging.
- Update generated bundles through `npm run build`; do not hand-edit them.

## Existing Contracts

- Avoid changing established card behavior unless the task asks for it; see `README.md` and the implementation for current details.

## History graph

- Graph history prefers recorder statistics and falls back to entity history. Preserve point thinning, gap handling, and the controller's stale-response and in-flight reload protections when changing graph loading.
