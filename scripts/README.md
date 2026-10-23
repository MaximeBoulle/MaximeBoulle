# Profile build

The profile README is a static SVG poster with embedded, subset fonts. It has no external asset dependencies, so it renders the same on GitHub, in dark mode, and offline.

## Rebuild

```bash
node scripts/fetch-fonts.mjs        # one-time: download Latin WOFF2 sources
node scripts/build-profile-svg.mjs  # subset fonts + write assets/*.svg
```

Requires Node 18+ and Python 3 with `fonttools` and `brotli`:

```bash
python -m pip install fonttools brotli
```

## Output

- `assets/profile-light.svg` — desktop light poster (900 × 2301)
- `assets/profile-dark.svg` — desktop dark poster (900 × 2301)
- `assets/profile-mobile-light.svg` — compact light poster (400 × 736)
- `assets/profile-mobile-dark.svg` — compact dark poster (400 × 736)
- `assets/btn-email.svg`, `assets/btn-linkedin.svg`, `assets/btn-github.svg` — linked buttons

The ticker is CSS-animated and respects `prefers-reduced-motion`. Fonts: Inter Tight, Inter, Space Mono (SIL Open Font License 1.1 — see `assets/fonts/OFL.txt`).
