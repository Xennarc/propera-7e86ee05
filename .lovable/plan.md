

## Make Hero Blob Animations Visible and Eye-Catching on Mobile/Tablet

Currently the blobs exist on mobile but are too small, too low-opacity, and too blurred to be noticeable. The fix is to boost their mobile sizes, increase opacity, reduce blur slightly, and add more dramatic drift distances for smaller screens.

### Changes

**`src/components/landing/HomeHero.tsx`** (lines 48-51)
- Increase mobile blob sizes: `w-[300px] h-[300px]` → `w-[380px] h-[380px]`, etc.
- Boost mobile opacity values significantly (e.g. `0.25` → `0.40`, `0.18` → `0.30`)
- Reduce mobile blur slightly for more definition (`blur-[100px]` → `blur-[80px]`)
- Reposition blobs to be more centered/visible in the mobile viewport

**`src/index.css`**
- Add mobile-specific keyframes with larger translate distances so movement is obvious on smaller screens
- Add a `@media (max-width: 767px)` block inside the `prefers-reduced-motion` query that uses faster animation durations (12-18s instead of 16-25s) for more noticeable motion on mobile

### Result
Blobs will be larger relative to viewport, more vivid in color, and move more noticeably on mobile and tablet — making the effect distinct and eye-catching without hurting readability (text has `z-10`).

