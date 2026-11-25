# Design System: JAROTCOMPILER

## 1. Visual Theme & Atmosphere

A cockpit-dense, terminal-native compiler cockpit for Android builders. The atmosphere is a
night-shift build server room: near-black zinc surfaces, one disciplined lime signal color,
monospace instrumentation everywhere. Density 7, variance 5, motion 6. Every screen feels like a
physical handheld dev-tool — chunky touch targets, zero fluff, build-first hierarchy. Nothing
decorative survives unless it explains state.

## 2. Color Palette & Roles

- **Cockpit Zinc** (#0C0F14) — App canvas, page background (never pure black)
- **Panel Graphite** (#141920) — Cards, drawer surface, sheets, elevated panels
- **Inset Ink** (#1B222C) — Inputs, code editor well, pressed states
- **Signal Lime** (#A6E22E) — Single accent: BUILD APK button, FAB, active file marker, focus rings, progress fill
- **Lime Ink** (#0C0F14) — Text on accent fills
- **Primary Snow** (#EDF2F7) — Primary text, headings
- **Muted Steel** (#8A94A6) — Secondary text, metadata, package names
- **Hairline** (rgba(237,242,247,0.09)) — 1px borders between zones
- **Fail Red** (#F87171) — Destructive only: delete confirm, failed builds
- Banned: no purple, no neon glow shadows, no gradients, no blue.

## 3. Typography Rules

- **Display/Headers:** Geist Mono — track-tight, weight 600, uppercase wordmarks; hierarchy through weight and color, not size shouting
- **Body:** Geist Sans — relaxed leading, muted steel for descriptions
- **Mono:** Geist Mono — all code, paths, package names, engine labels, timestamps, status text
- **Banned:** Inter, generic serifs. Body text minimum 0.875rem (14px).

## 4. Component Stylings

- **Buttons:** Flat fill, no outer glow. Primary = Signal Lime fill + Lime Ink text, tactile -1px translate + darker fill on active. Ghost = Panel Graphite fill + snow text. All ≥ 44px touch height.
- **Cards:** Project cards = Panel Graphite, 1rem radius, hairline border, diffused zinc-tinted shadow. Used only for real hierarchy (projects, engine selector).
- **Inputs:** Label above (mono, uppercase, small), helper below, error text in Fail Red below. Inset Ink fill, hairline border, focus ring in Signal Lime.
- **Loaders:** Build progress = horizontal bar with lime fill + shimmering stripes while running; step rows use pulsing icon states (not circular spinners).
- **Empty States:** Composed terminal glyph + one line instruction pointing to the FAB. No bare "No data".

## 5. Layout Principles

- Mobile-first single column, max-width 30rem centered on desktop with the cockpit centered like a phone canvas.
- Zones separated by hairlines and negative space, not nested cards.
- Fixed bottom action zone (BUILD APK / create) with `env(safe-area-inset-bottom)` padding; content scrolls above it.
- Drawer file explorer slides from left at 84% width; tree indentation guides use hairlines.
- Full-height layouts use `min-h-[100dvh]` flex column; footer/action bar never floats or overlaps.

## 6. Motion & Interaction

- Spring physics (stiffness 100, damping 20) for drawer, sheets, engine switch.
- Engine `< >` switcher: slide + fade of engine card, chevron buttons scale 0.96 on press.
- FAB: gentle perpetual 3s pulse ring while list is empty; -1px translate on tap.
- Staggered cascade reveal for project cards (60ms steps).
- Build step icons: active step icon pulses; done steps check with lime; transform/opacity only.

## 7. Anti-Patterns (Banned)

No emojis in UI. No Inter. No pure black #000000. No purple/neon glows. No gradients. No
3-column equal card rows. No centered hero marketing. No filler text ("Scroll", "Swipe down").
No invented metrics or fake stats. No `LABEL // YEAR` typographic tics. No generic placeholder
names. Delete actions always require confirmation.
