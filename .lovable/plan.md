
The recent guest portal redesign (pill-on-paper, Obsidian active states, Sand surfaces, Playfair greetings) was tuned at the current 468px mobile viewport. I need to verify it scales cleanly to tablet (768–1024) and desktop (≥1280) and fix anything that looks off at those widths.

Let me scope what needs review:
- `GuestLayout` — header max-width, padding, nav alignment
- `GuestHome` — hero height, stat-pill row layout, quick actions grid columns
- `GuestQuickActions` — grid breakpoints (currently likely 2-col, should expand)
- `GuestBottomNav` — keep mobile-only? Or also desktop with side rail? (Currently shows on all sizes via guest layout)
- `.guest-card`, `.guest-stat-pill` — radius/padding may feel small on desktop

I'll read the current files to confirm exact breakpoint usage before planning edits.
