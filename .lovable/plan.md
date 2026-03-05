

## Make Hero Gradient More Visible & Prominent

The current gradient opacities are very low (0.06–0.12 light, 0.08–0.15 dark), making the effect barely perceptible. The fix is straightforward: increase opacity values significantly.

### Changes

**`src/index.css`** — Boost gradient opacity across both themes:

| Layer | Current (light) | New (light) | Current (dark) | New (dark) |
|-------|-----------------|-------------|-----------------|------------|
| Primary (lime) | 0.12 | 0.25 | 0.15 | 0.30 |
| Teal | 0.10 | 0.20 | 0.12 | 0.25 |
| Blurple | 0.08 | 0.18 | 0.10 | 0.22 |
| Secondary primary | 0.06 | 0.14 | 0.08 | 0.18 |

Also widen ellipse spread slightly (e.g. `80% 60%` → `90% 70%`) so the gradient covers more of the viewport rather than concentrating in small spots.

Single file change, ~12 lines modified.

