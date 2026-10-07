# Design System Inspired by MindSphere

**Logo note:** the reference's triangle mark and "MindSphere" wordmark are that product's own brand assets. This system specifies the logo slot (mark + wordmark, top-left, white on black) so your own brand drops in. Don't reuse the reference's mark.

**Frame note:** the gray laptop bezel and dark vignette around the screenshot are presentation mockup, not part of the site. Everything below describes the black screen inside it.

## 1. Visual Theme & Atmosphere

Pure black stage, one hero object, one color. The page is a dark-mode AI-agent product site where everything is charcoal and quiet except a glossy black robot lit from below by an emerald glow, and a headline that ends in the brand name in emerald. Surfaces are near-black with hairline borders, buttons are charcoal rather than colored, and depth comes from glow and reflection instead of shadow. It reads as premium, technical and calm, with a crypto-native edge from the "Buy $TOKEN" nav action.

**Key Characteristics**
- Pure `#000` hero with charcoal (never gray-blue) surfaces layered above it
- One accent, emerald, used for the dome glow, a thin ring, the headline's closing brand name, and hover states
- A single glossy 3D black object (chrome highlights, emerald underglow) as the hero's entire visual, sitting inside a semicircular dome of light
- Charcoal ghost buttons as the primary action; no filled color buttons in the hero
- Centered, symmetric composition: robot, two-line headline, short paragraph, one button
- A section divider built from a glowing hairline, a small emblem circle, and a second hairline
- One typeface (Inter), weight-differentiated, with a regular-to-medium headline rather than a heavy one

## 2. Color Palette & Roles

### Primary
- **Void** (`#000000`): hero and page ground
- **White** (`#FFFFFF`): headlines, wordmark

### Accent
- **Emerald** (`#3ED89B`): brand-name headline accent (gradient start), hover borders, focus ring
- **Emerald Deep** (`#2E8F6E`): gradient end of the headline accent
- **Dome Glow** (`#2DBE82`): the semicircle's inner light
- **Ring** (`#1F7A57`): the thin arc around the dome (at about 60% opacity)

### Interactive
- **Button Fill** (`#15181D`): charcoal ghost button
- **Button Border** (`#272B32`): resting border
- **Button Hover Fill** (`#1B1F25`) with border `rgba(62,216,155,.45)`
- **Emerald Solid** (`#3ED89B`, text `#04140D`): extrapolated; confirm or launch actions inside the product only, one per screen

### Neutral Scale
- **Nav Text** (`#D5D8DE`)
- **Muted** (`#8C909C`): body copy (6.6:1 on black)
- **Dim** (`#5C616C`): decoration and disabled only; fails AA for text
- **Surface 1** (`#0B0D0F`): cards, panels (extrapolated)
- **Surface 2** (`#15181D`): buttons, inputs

### Surface & Borders
- **Hairline** (`#1D2127`): card borders (extrapolated)
- **Border Strong** (`#2F343C`): inputs, focused containers
- **Divider Glow:** `linear-gradient(90deg, transparent, #1E3A30 45%, #1E3A30 55%, transparent)`

### Gradients (the only two)
- **Headline accent:** `linear-gradient(90deg, #3ED89B, #2E8F6E)` clipped to text
- **Dome:** `radial-gradient(ellipse at 50% 100%, rgba(45,190,130,.9) 0%, rgba(45,190,130,.35) 40%, transparent 72%)`

## 3. Typography Rules

### Font Family
**Primary:** Inter, sans-serif, used for every role.
Fallback: 'Geist', -apple-system, 'Segoe UI', sans-serif

**Secondary:** *(same family)*. Hierarchy comes from size, weight and color, with no second typeface.

### Hierarchy

| Role | Font | Size / Line | Weight | Tracking | Color |
|------|------|-------------|--------|----------|-------|
| Display (hero H1) | Inter | 56 / 62 | 500 | -0.02em | White, closing brand name in the accent gradient |
| Section Headline | Inter | 40 / 46 | 500 | -0.02em | White |
| Card Title | Inter | 20 / 28 | 500 | -0.01em | White |
| Lead / Hero Body | Inter | 16 / 26 | 400 | 0 | Muted |
| Body | Inter | 14 / 22 | 400 | 0 | Muted |
| Nav | Inter | 14 / 20 | 400 | 0 | Nav Text |
| Button | Inter | 14 / 20 | 500 | 0 | `#E8EAEE` |
| Wordmark | Inter | 18 / 22 | 500 | -0.01em | White |
| Caption | Inter | 12 / 18 | 400 | 0 | Muted |

### Principles
- Headlines are medium (500), never bold; the page gets its weight from the black ground, not heavy type
- The emerald gradient appears on one closing phrase per page, the product name; never on a mid-sentence word and never on body text
- Sentence case everywhere; no uppercase labels
- Body is Muted, not white, so the headline stays the brightest text
- Tokens and tickers (for example `$MINDS`) stay in Inter at button weight

## 4. Component Stylings

### Buttons

**Primary (ghost charcoal)** (as shown for "Buy $MINDS" and "Connect Dapp")
- **Background:** `#15181D` · **Border:** `1px solid #272B32` · **Text:** `#E8EAEE`
- **Radius:** `10px` · **Height:** `40px` nav, `48px` hero · **Padding:** `0 20px` nav, `0 24px` hero
- **Font:** Inter 500, 14px
- **Hover:** fill `#1B1F25`, border `rgba(62,216,155,.45)`, `box-shadow: 0 0 24px rgba(62,216,155,.22)`
- **Active:** `scale(.98)` · **Focus:** `2px solid #3ED89B`, offset `2px`

**Emerald Solid** (extrapolated, in-product only)
- **Background:** `#3ED89B` · **Text:** `#04140D` · same size and radius
- **Hover:** `#52E2AA`

**Text Link:** Nav Text with an underline on hover; no color change.

### Cards & Containers (extrapolated; none shown in the reference)
- **Panel:** `#0B0D0F` fill, `1px solid #1D2127`, radius `16px`, padding `24px`
- **Hover:** border `rgba(62,216,155,.35)`; no shadow
- **Icon tile:** `40px`, `#15181D` fill, `1px solid #23272E`, radius `10px`, emerald stroke icon `20px`
- Contents stack left-aligned: icon, Card Title, Body

### Hero Object ("agent render")
- **Subject:** one glossy black 3D figure, cut out on a transparent background, upper body facing the viewer, chest bearing the brand mark
- **Size:** about `520 × 360px` desktop, centered
- **Lighting:** chrome rim highlights on black glass and carbon; emerald underlight spilling from the dome behind it
- **Dome:** a semicircle about `520px` across behind the figure, filled with the Dome gradient, edged with a `1px` Ring arc, fading to transparent at its base so the figure's lower edge dissolves into black
- **Spacing:** figure top `64px` under the nav; headline starts about `12px` below the dome's base
- **No drop shadow;** the glow is the only light

### Section Divider
- A `60px` circle (`#0B0D0F`, `1px solid #1D2127`) holding the brand mark at 24px, with a soft emerald glow of `0 0 32px rgba(62,216,155,.18)`
- Flanked by two Divider Glow hairlines (`1px`, up to `340px` each) that fade at their outer ends
- Doubles as the scroll cue after the hero

### Inputs & Forms (extrapolated)
- **Background:** `#15181D` · **Border:** `1px solid #272B32` · **Radius:** `10px` · **Height:** `48px`
- **Text:** `#E8EAEE` · **Placeholder:** `#5C616C`
- **Focus:** border `#3ED89B` plus `0 0 0 4px rgba(62,216,155,.16)`

### Navigation
- **Background:** transparent over the black hero (on scroll: `rgba(0,0,0,.72)` with `backdrop-filter: blur(12px)` and a `1px #1D2127` bottom edge)
- **Height:** `72px` · **Side padding:** `40px`
- **Layout:** logo slot left (28px mark + wordmark); seven links right-aligned with `24px` gaps; the Primary button as the last item
- **Link hover:** Nav Text to White
- **Mobile:** logo left, menu button right; links and the token button move into the menu

## 5. Layout Principles

### Spacing System
**Base Unit:** `4px`
**Scale:** `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96, 120`

| Relationship | Value |
|--------------|-------|
| Nav → hero object | 64 |
| Dome base → headline | 12 |
| Headline → body | 24 |
| Body → button | 32 |
| Hero → divider | 96 |
| Section padding (top and bottom) | 120 desktop · 80 tablet · 64 mobile |
| Card grid gap | 20 |

### Grid & Container
- **Max width:** `1200px`, centered · **Side padding:** `40px` desktop, `20px` mobile
- **Hero:** single centered column; body max width `640px`, headline max `820px`
- **Content sections:** 12 columns, `20px` gutter, left-aligned card content under a centered section headline

### Whitespace Philosophy
Black space is the frame. The hero object has nothing competing with it, and the type stack beneath it is short on purpose: one headline, one paragraph, one button. Sections that follow should keep the same pace, with a headline, a short lead and one grid, separated by wide black gaps rather than rules.

### Border Radius Scale
- `10px` buttons, inputs, icon tiles
- `16px` panels and cards
- `50%` divider emblem
- `9999px` tags and chips (extrapolated)

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 Void | `#000` | page ground |
| 1 Surface | `#0B0D0F` + `1px #1D2127` | cards, panels |
| 2 Control | `#15181D` + `1px #272B32` | buttons, inputs |
| Glow | emerald radial or box-shadow glow | hero dome, button hover, divider emblem |
| Reflection | chrome highlights in the render | hero object only |

**Philosophy:** this is a no-shadow system. Layers are told apart by a step in near-black and a hairline border, and attention is directed by glow. Emerald glow is the only light source, so it appears at the dome, the divider emblem and hover states, and nowhere else.

## 7. Do's and Don'ts

### Do
- Keep the hero pure black with one centered object
- Use emerald for the dome, ring, closing brand name, hover and focus only
- Keep buttons charcoal with a hairline border; let hover bring the emerald
- Keep headlines at weight 500
- Treat imagery as glossy black renders with chrome highlights and emerald underlight
- Fade any image edge that meets text into black instead of masking it hard

### Don't
- Don't fill buttons with emerald in marketing sections
- Don't add a second accent color
- Don't use drop shadows; use a border step or glow
- Don't put the gradient on mid-sentence words or body text
- Don't use blue-tinted grays for surfaces; they stay neutral charcoal
- Don't use Dim (`#5C616C`) for readable text
- Don't reuse the reference's logo mark

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <640px | Nav is logo plus menu button; hero object `78vw` wide, dome scales with it; headline `32 / 38`; button `100%` wide (max `320px`); divider hairlines shorten to `80px` |
| Tablet | 640–1023px | Object `420px`, headline `44 / 50`; nav shows the logo, the token button and a menu |
| Desktop | 1024–1439px | Full layout as specified |
| Wide | ≥1440px | Container stays `1200px`; black extends edge to edge |

### Type by Breakpoint
| Role | Mobile | Tablet | Desktop |
|------|--------|--------|---------|
| Display | 32 / 38 | 44 / 50 | 56 / 62 |
| Section Headline | 28 / 34 | 34 / 40 | 40 / 46 |
| Lead | 15 / 24 | 16 / 26 | 16 / 26 |

### Touch Targets
- **Minimum:** `44 × 44px`; hero button is `48px`
- Respect `prefers-reduced-motion`: no glow pulse; the dome and glow stay static

## 9. Agent Prompt Guide

### Quick Color Reference
- **Ground:** Void `#000000` · Surface 1 `#0B0D0F` · Surface 2 `#15181D`
- **Lines:** Hairline `#1D2127` · Border `#272B32`
- **Text:** White `#FFFFFF` · Nav `#D5D8DE` · Muted `#8C909C`
- **Accent:** Emerald `#3ED89B` · Deep `#2E8F6E` · Dome `#2DBE82` · Ring `#1F7A57`

### Token Starter
```css
:root{
  --font:'Inter','Geist',-apple-system,'Segoe UI',sans-serif;
  --void:#000; --s1:#0B0D0F; --s2:#15181D;
  --hairline:#1D2127; --border:#272B32;
  --text:#fff; --nav:#D5D8DE; --muted:#8C909C;
  --emerald:#3ED89B; --emerald-deep:#2E8F6E;
  --accent-text:linear-gradient(90deg,#3ED89B,#2E8F6E);
  --r-ctrl:10px; --r-card:16px; --gap:20px; --section-y:120px;
}
```

### Build Order
1. Black ground, the token block, Inter at 14/22 Muted.
2. The type ladder, with the accent-gradient text utility.
3. Primary button, then nav.
4. Hero: object slot, dome, headline, lead, button.
5. Section divider.
6. Panel and icon-tile components, then the first content section.
7. Check contrast, that emerald appears only where listed, and the breakpoints.

### Iteration Guide
1. **The page is black, with charcoal surfaces and exactly one accent, emerald.**
2. **Buttons are charcoal with a hairline border; emerald arrives on hover and focus.**
3. **The headline is Inter 500, white, with the closing brand name in the emerald gradient.** Use the gradient once per page.
4. **The hero is one centered glossy-black object in a dome of emerald light,** with the headline starting just under the dome's faded base.
5. **No drop shadows anywhere.** Use a border step or an emerald glow.
6. **The divider is hairline, emblem, hairline,** and it doubles as the scroll cue.
7. **Body copy is Muted, never white.**
8. **Controls and icon tiles use `10px` radius; panels use `16px`.**
9. **Imagery means black glossy renders with chrome highlights and emerald underlight;** no photos, no flat illustration.
10. **Keep surfaces neutral charcoal,** never blue-tinted.
11. **Use the Spacing table values for every gap.**
12. **The logo slot holds your own mark.**
