# Design System: Cyber Trace AI — Cyber Forensics Dashboard

## 1. Visual Theme & Atmosphere

A **cockpit-dense, tension-weighted** investigation interface built for analysts scanning
thousands of communication and financial records under time pressure. The atmosphere is
**clinical and nocturnal** — like the operations room of a digital forensics lab at 2 AM:
every pixel earns its place, every color communicates risk, every animation signals what changed.

- **Density:** 9/10 — Cockpit Dense. Information density over whitespace. Sidebars are
  data-dense panels, not decorative containers. Every element is sized for rapid scanning,
  not leisurely browsing.
- **Variance:** 7/10 — Offset Asymmetric. The three-panel layout (left sidebar / center
  canvas / collapsible right sidebar) breaks symmetry deliberately. The header left-loads
  the brand and right-loads actions with a structural divider — never centered.
- **Motion:** 6/10 — Fluid CSS. Layout transitions animate (400ms spring), nodes fade in
  on graph load, skeleton shimmers pulse during data fetch. Motion is functional — it
  communicates state change, never decorates.

The design language is **forensic utilitarianism**: high-contrast on near-black, risk-signaling
through color-coded borders and badges, monospace for every identifier an investigator might
compare character-by-character. This is not a product page. This is an instrument panel.

## 2. Color Palette & Roles

All colors extend Tailwind via `@theme` CSS custom properties. Never hardcode hex values
in components — always reference the token.

| Descriptive Name | Token | Hex | Functional Role |
|---|---|---|---|
| **Deep Void** | `base` | `#05080d` | App background. Near-black with a blue undertone — never pure #000000. |
| **Midnight Slate** | `panel` | `#0c131e` | Card, sidebar, and panel fills. Primary surface layer above the void. |
| **Dark Steel** | `panel-alt` | `#101a29` | Nested/inset panels, skeleton blocks, selected-node detail backgrounds. |
| **Ghost Border** | `border-default` | `#1c2a3d` | All structural dividers, card borders, section separators. 1px only. |
| **Arctic White** | `text-primary` | `#dce6f2` | Primary body text, node labels, headings. High contrast on panels. |
| **Muted Steel** | `text-muted` | `#7d90a8` | Secondary/meta text, descriptions, placeholder states, timestamps. |
| **Cyan Pulse** | `accent` | `#2dd4e0` | Single accent. Active states, focus rings, primary CTAs, links. Saturation ~75%. |
| **Cyan Deep** | `accent-dim` | `#1a8b93` | Hover states, secondary accent use, case ID badges. |
| **Alarm Red** | `risk-critical` | `#ff5673` | Critical risk badges, orchestrator highlights, loop detection overlays. |
| **Amber Warning** | `risk-medium` | `#ffb238` | Medium risk badges, demo-mode-only affordances (never mixed with accent). |
| **Clear Green** | `risk-low` | `#35d399` | Low risk badges, healthy/verified states. |

**Constraints:**
- Exactly ONE accent color (Cyan Pulse). Saturation stays below 80%.
- Amber is RESERVED for medium-risk badges and demo-mode UI exclusively. Never use amber
  as a second accent for CTAs, links, or interactive highlights.
- Risk colors (red/amber/green) are semiotic — they mean the same thing everywhere.
  A red border on a canvas node, a red badge in the sidebar, and a red row in the report
  export all communicate identical severity.
- Never use pure black (`#000000`). Deep Void (#05080d) provides the dark floor.
- Ghost Border at 50% opacity for subtle separators; full opacity only for active dividers.

## 3. Typography Rules

### Font Stacks
- **Display / Headlines:** `Space Grotesk` (500–700) — Geometric, technical, track-tight.
  Used for section headers ("DATA UPLOAD", "NETWORK STATS"), the app title, and
  the demo drawer step titles. Hierarchy through weight and color (Arctic White vs
  Muted Steel), NOT through dramatic size jumps.
- **Body / UI Chrome:** `Satoshi` (400–700) — Labels, buttons, descriptions, sidebar text.
  Geometric warmth with technical precision. Tight line-height (1.4) for density.
  Max 65ch line width in any body paragraph.
- **Data / Identifiers:** `JetBrains Mono` (400–600) — Phone numbers, account IDs,
  timestamps, case IDs, centrality scores, network stats, risk badge labels.
  ALWAYS monospace for anything an investigator might compare character-by-character.
  All numeric displays use JetBrains Mono at high density (>7 density score).

### Scale Hierarchy
- App title: `text-sm font-display font-bold tracking-wide` — never oversized
- Section headings: `text-[11px] font-display font-semibold uppercase tracking-wider text-text-muted`
- Body text: `text-xs` or `text-[11px]`
- Data values: `text-[10px] font-mono`
- Risk badges: `text-[10px] font-mono font-semibold uppercase`

### Banned Typography
- `Satoshi` replaces Inter as the body font — it has the geometric character of a premium
  typeface while maintaining the legibility needed at 10-11px sizes in dense panels.
- No generic serif fonts (Times New Roman, Georgia, Garamond, Palatino).
- No font sizes above `text-base` in any component — this is not a landing page.
- No decorative font variations (italic, oblique) in data displays.

## 4. Component Stylings

### Risk Badge
**The signature component.** Every occurrence — canvas tooltip, sidebar row, report row,
header badge — uses the IDENTICAL visual combination. No deviation, no contextual variation.

- Shape: Rounded rectangle, 2px border, 15% opacity background tint
- Size variants: `sm` (10px text, 6px padding) and `md` (12px text, 10px padding)
- Typography: JetBrains Mono, font-semibold, uppercase, letter-spaced
- Icon + Label always paired (AlertTriangle + "CRITICAL", AlertCircle + "MEDIUM", CheckCircle + "LOW")
- Colors: border-color and text-color match the risk level token exactly

### Buttons
- **Primary (Cyan):** Cyan Pulse background, Deep Void text. No outer glow. Tactile -1px
  translateY on `:active` for push feedback. Used for upload actions and primary CTAs.
- **Ghost/Outline:** Border in Ghost Default, transparent background, text in Muted Steel
  or Arctic White. Hover shifts to panel-alt background. Used for secondary actions.
- **Demo-Only (Amber):** Amber border at 40% opacity, Amber text, transparent background.
  Intentionally visually distinct from both primary and destructive — cannot be mistaken
  for a real investigator action on live case data.
- **Destructive (Red):** Risk-Critical border at 30% opacity, Risk-Critical text. Used for
  reset and delete actions only.
- **All buttons:** Minimum 44px touch target. Monospace labels. Lucide icons sized at
  `w-3.5 h-3.5` (14px) for inline, `w-4 h-4` (16px) for standalone.

### Cards / Panels
- Background: Midnight Slate (#0c131e). Border: 1px Ghost Border.
- No drop shadows — the dark palette makes shadows invisible. Hierarchy through border
  and background tint, not shadow depth.
- Nested panels use Dark Steel (#101a29) for inset visual depth.
- Rounded corners: `rounded` (4px) for small elements, `rounded-lg` (8px) for panels.
  No generously rounded corners — this is an instrument, not a social app.

### Skeleton Loaders
Every async view shows a **shape-matched skeleton**, never a bare spinner.
- Blocks: Dark Steel background with a sweeping white/5% gradient shimmer (1.5s infinite)
- Skeleton dimensions match the eventual content shape exactly
- For the graph canvas specifically: show a centered spinner with "Building network graph..."
  text in JetBrains Mono, since the canvas is a single large area

### Inputs / Forms
- Label above input (not floating, not inline)
- Helper text optional, error text below in Risk-Critical
- Focus ring: 2px Cyan Pulse outline, 2px offset
- Range sliders: 4px track in Ghost Border, 14px circular thumb in Cyan Pulse
  with Deep Void border. No tick marks, no value labels by default.

### Empty States
- Centered composition: icon (32px, Muted Steel, in a Dark Steel circle) + two-line text
- Icon is a simplified network graph SVG (three nodes, two edges) — domain-relevant
- Primary text: `text-sm font-display text-text-muted`
- Secondary text: `text-xs text-text-muted mt-1` — instruction for how to populate

### Toast Notifications
- Fixed bottom-right, z-50, max-width 384px (sm)
- Success: Risk-Low tinted background, Risk-Low border, CheckCircle icon
- Error: Risk-Critical tinted background, Risk-Critical border, AlertTriangle icon
- JetBrains Mono text. Dismiss button (X icon) at trailing edge.
- Auto-dismiss after 5 seconds with slide-in animation

## 5. Layout Principles

### Three-Panel Cockpit
```
┌─────────────────────────────────────────────────────┐
│  HEADER: Brand | Case Info         | Actions        │
├────────┬──────────────────────────┬─────────────────┤
│ LEFT   │                          │ RIGHT           │
│ SIDEBAR│    GRAPH CANVAS          │ SIDEBAR         │
│ (256px)│    (flex-1, full height) │ (288px)         │
│ Upload │                          │ Suspects        │
│ Filter │                          │ Patterns        │
│ Stats  │                          │ Detail          │
└────────┴──────────────────────────┴─────────────────┘
```

- Left sidebar: Fixed 256px width. Upload controls, time-range filters, network stats.
- Center: `flex-1` Cytoscape.js canvas, full remaining height. `bg-base` (Deep Void).
- Right sidebar: Fixed 288px width, collapsible. Risk summary, flagged suspects, patterns,
  selected-node detail panel.
- Header: Fixed height, `bg-panel`, 1px bottom border. Brand left, actions right.
  Structural border divider between brand info and action buttons.

### Spacing Philosophy
- Section padding: 12px (`p-3`)
- Internal element gaps: 6–8px (`gap-1.5` to `gap-2`)
- Text-to-element spacing: 4–6px
- This is a density-first layout — every pixel of whitespace must justify its existence.

### Grid Over Flexbox
- The three-panel layout uses flexbox for the top-level split (appropriate for dynamic widths)
- Internal sidebar layouts use flexbox column with gap
- The graph canvas is a single full-area container (Cytoscape manages its own internal layout)
- Never use `calc()` percentage hacks — prefer flex-1 and explicit widths

### Responsive Behavior
- Below 768px: Right sidebar collapses (hidden). Left sidebar collapses to icon-only or
  slide-over. Graph canvas takes full width.
- The header remains fixed at all viewports.
- Touch targets scale to minimum 44px on mobile.
- `min-h-[100dvh]` for full-height containers — never `h-screen` (iOS Safari jump bug).

## 6. Motion & Interaction

### Spring Physics
- Graph layout animation: `animationDuration: 400ms` (Cytoscape `cose` layout)
- Node selection zoom: `duration: 300ms`
- All CSS transitions: `transition-colors` or `transition-duration: 300ms`
- Default easing: `ease-out` for entrances, no linear easing anywhere

### Perpetual Micro-Interactions
- **Skeleton shimmer:** `translateX(-100% to 100%)` gradient sweep, 1.5s infinite loop.
  The only perpetual animation — signals "loading" without being distracting.
- **Orchestrator pulse:** Cytoscape overlay opacity oscillation on orchestrator nodes,
  signaling their elevated status without requiring hover.
- **Graph hover:** Neighborhood highlight — connected nodes stay bright, non-connected
  fade to 15% opacity. Instant response, no animation delay.

### Staggered Orchestration
- Demo drawer slides in from right (300ms ease-out)
- Toast notifications slide in from bottom (300ms)
- Sidebar section expand/collapse is instant (no animation — density over delight)
- Graph nodes appear via Cytoscape layout animation (400ms, all nodes simultaneously)

### Performance Rules
- Animate exclusively via `transform` and `opacity`. Never animate `top`, `left`, `width`,
  `height`, `margin`, or `padding`.
- Skeleton shimmer uses `translateX` only — GPU-composited, no layout thrashing.
- Graph canvas is a Canvas 2D element (Cytoscape) — no DOM manipulation for node positions.
- All CSS transitions use `will-change` hints on animated properties.

## 7. Anti-Patterns (Banned — NEVER DO)

These are the explicit AI-generated design clichés that this system rejects:

- **No emojis.** Not in headings, not in buttons, not in toast messages, not anywhere.
- **No Inter for premium contexts.** Inter is used here ONLY because this is a
  density-first investigation dashboard. If the project scope changes to marketing/landing,
  Inter must be replaced with Geist, Outfit, or Satoshi.
- **No pure black (`#000000`).** Deep Void (#05080d) is the dark floor. Pure black
  eliminates depth hierarchy.
- **No neon or outer glow shadows.** No purple button glows, no cyan box-shadows,
  no gradient text on large headers. Risk is communicated through color-coded borders,
  not luminous effects.
- **No oversaturated accents.** Cyan Pulse is at ~75% saturation. Saturated neon cyan
  (#00FFFF) is banned.
- **No generic names.** No "John Doe", "Acme Corp", "Nexus Industries" in demos.
  All placeholder data uses Indian phone numbers (+91XXXXXXXXXX) and bank account
  numbers appropriate to the CDR/financial investigation domain.
- **No fake round numbers.** No "99.99% accuracy" or "50% faster". Use real computed
  values from the actual analysis.
- **No AI copywriting clichés.** No "Elevate your investigations", "Seamless analysis",
  "Unleash the power of AI", "Next-Gen forensic intelligence". The tone is factual,
  direct, investigator-to-investigator.
- **No filler UI text.** No "Scroll to explore", "Swipe down", scroll arrow icons,
  bouncing chevrons, or "Learn more" links. Content pulls users in by being useful.
- **No centered Hero sections.** The header is always left-aligned brand, right-aligned
  actions. Never centered.
- **No 3-column equal card layouts.** Use asymmetric grids, zig-zag layouts, or
  data-dense sidebars instead.
- **No generic circular spinners as primary loaders.** Always use skeleton loaders
  matching the layout dimensions. The only acceptable spinner is a small accent-colored
  one for the graph canvas loading state (single large area, no shape to match).
- **No overlapping elements.** Every element occupies its own clear spatial zone.
  No absolute-positioned content stacking on top of other content.
- **No broken Unsplash links.** Use `picsum.photos` or inline SVG for any imagery.
- **No custom mouse cursors.** Default cursor everywhere.
- **No gradient text on headings.** Text is flat Arctic White or Muted Steel. Period.

## 8. Stitch Prompting Notes

When generating new screens for this project via Google Stitch:

### Visual Description Template
"A cockpit-dense investigation dashboard with a deep void black (#05080d) background,
midnight slate (#0c131e) panels, and ghost border (#1c2a3d) dividers. The single accent
is a muted cyan (#2dd4e0) used only for active states and primary actions. Risk is
communicated through a three-tier color system: alarm red (#ff5673) for critical,
amber warning (#ffb238) for medium, clear green (#35d399) for low. Typography uses
Space Grotesk for geometric headers, JetBrains Mono for all data identifiers, and
Satoshi for UI chrome. No neon effects, no emojis, no gradient text, no centered layouts.
Density over whitespace. Every pixel is functional."

### Contextual Additions
- For upload screens: "Dense form layout with label-above-input pattern, monospace
  field previews, and skeletal shimmer during processing."
- For graph views: "Full-bleed dark canvas with risk-colored node borders, animated
  layout transitions, and neighborhood highlight on hover."
- For report exports: "Monospace-heavy document layout with risk badges, structured
  tables, and forensic audit trail formatting."
- For sidebar panels: "Data-dense scrollable panels with 10-11px monospace text,
  collapsible sections, and risk-summary counters at the top."
