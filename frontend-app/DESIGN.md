---
name: LawGPT AI
description: An AI-native legal operating system, designed like the desk of trusted counsel
colors:
  paper: "#F9F8F6"
  ink: "#15171E"
  forest-primary: "#1F4C3C"
  forest-light: "#2C6E52"
  forest-dark: "#0F2B21"
  brass-accent: "#98753A"
  neutral-secondary: "#EFECE7"
  neutral-muted: "#F2F1ED"
  neutral-border: "#E5E2DC"
  signal-red: "#CA3221"
typography:
  display:
    fontFamily: "'Source Serif 4', Georgia, serif"
    fontSize: "clamp(1.75rem, 4vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.forest-primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.forest-light}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: LawGPT AI

## 1. Overview

**Creative North Star: "The Counsel's Desk"**

LawGPT AI reads as a premium digital workspace where trusted legal counsel meets modern AI, not a generic AI-startup dashboard. The system pulls from paper, ink, and brass: the physical materials of a lawyer's desk, translated into software with restraint. Typography carries authority (a serif display face used sparingly for headlines), while the working surface stays quiet, warm-neutral paper, near-black ink text, a single deep-forest accent for action, a brass highlight reserved for rare emphasis.

This system explicitly rejects the generic AI-startup toolkit: no gradient blobs, no glassmorphism, no neon or purple-blue "AI" accent colors, no floating glowing cards, no hero-metric templates with gradient text. Depth comes from typography and composition, not shadows. The result should feel like it belongs on a lawyer's desk that has been thoughtfully turned into software, calm, precise, and confident enough that both a first-time consumer and a corporate counsel trust it immediately.

**Key Characteristics:**
- Warm paper background, never stark white or cold gray
- One accent (forest green) carries almost all action color; brass is a rare highlight, not a second primary
- Serif display type for authority, sans body for readability, mono for anything record-like (stats, citations, timestamps)
- Flat surfaces at rest; elevation is a response to interaction, not a permanent decoration
- Motion is restrained and purposeful: entrances fade/slide once, nothing loops or glows

## 2. Colors

The palette is restrained: warm paper neutrals carry the surface, one deep forest green carries action and trust, brass appears only where a moment deserves emphasis.

### Primary
- **Counsel Forest** (`#1F4C3C`): the single action color. Buttons, links, focus rings, active nav states. Used deliberately, not washed across the page.
- **Counsel Forest, Light** (`#2C6E52`): hover state for forest-primary surfaces.
- **Counsel Forest, Deep** (`#0F2B21`): pressed/active state, or reversed-out text on light brass surfaces.

### Secondary
- **Brass Seal** (`#98753A`): rare highlight for a wax-seal-like moment, a citation mark, a verified badge, a single emphasized stat. Never more than one brass element per screen.

### Neutral
- **Desk Paper** (`#F9F8F6`): page background. Warm, not stark white, not the saturated cream/sand AI default; deliberately closer to true paper than to "cozy beige."
- **Desk Ink** (`#15171E`): primary text and headline color. Near-black with a cool undertone, not pure `#000`.
- **Paper Fold** (`#EFECE7`): secondary surface (muted panels, secondary buttons at rest).
- **Paper Shadow** (`#F2F1ED`): muted background (disabled states, subtle section breaks).
- **Margin Line** (`#E5E2DC`): all borders and dividers. Hairline, never heavier than 1px at rest.
- **Filing Red** (`#CA3221`): destructive actions and error states only.

### Named Rules
**The One Accent Rule.** Forest green is the only color that means "action" anywhere in the product. If a second saturated color starts meaning "action" too, the system has drifted.

**The Brass Scarcity Rule.** Brass appears at most once per screen. It marks the single most important verified/emphasized element, never a decorative repeated accent.

## 3. Typography

**Display Font:** 'Source Serif 4' (with Georgia, serif fallback)
**Body Font:** Inter (with system-ui, sans-serif fallback)
**Label/Mono Font:** 'IBM Plex Mono' (with ui-monospace, monospace fallback)

**Character:** Serif carries the authority of a legal document; Inter keeps working UI legible and fast to scan; IBM Plex Mono marks anything that reads as a record, a figure, a case number, a timestamp, so numbers feel precise rather than decorative.

### Hierarchy
- **Display** (600, `clamp(1.75rem, 4vw, 3rem)`, 1.15 line-height, -0.01em tracking): hero headlines and page-defining moments only. Source Serif 4.
- **Headline** (600, `text-2xl`/24px, 1.2 line-height): section titles (`h2`). Source Serif 4.
- **Title** (600, `text-xl`/20px, 1.25 line-height): card and panel titles (`h3`). Source Serif 4.
- **Body** (400, 15px, 1.6 line-height): all reading copy, max 65–75ch line length. Inter.
- **Label** (500, 13px, 0.02em tracking): stats, timestamps, case/document identifiers, mono data. IBM Plex Mono. Not used for section eyebrows or decorative kickers.

### Named Rules
**The Serif Restraint Rule.** Source Serif 4 appears only at h1–h3 scale. It never appears in body copy, buttons, or labels; that would dilute its authority into decoration.

## 4. Elevation

Flat by default. Surfaces sit at rest with a 1px `Margin Line` border and no shadow. Shadow exists only as feedback: a card gains `card-hover` shadow on interaction, communicating "this responded to you," not "this is important." Hierarchy comes from typography, spacing, and composition, not from stacking shadows or glass blur.

### Shadow Vocabulary
- **card** (`box-shadow: 0 1px 2px rgba(20,23,31,0.04), 0 1px 1px rgba(20,23,31,0.03)`): resting shadow on bordered surfaces, barely perceptible, a hint of separation from the page.
- **card-hover** (`box-shadow: 0 4px 16px rgba(20,23,31,0.08), 0 1px 2px rgba(20,23,31,0.04)`): interaction-only. Applied on hover/focus to signal responsiveness.

### Named Rules
**The Flat-at-Rest Rule.** Nothing above resting `card` shadow unless a user is actively hovering or focusing it. No permanently "floating" elements.

## 5. Components

### Buttons
- **Shape:** rounded-md (8px, `calc(var(--radius) - 2px)`)
- **Primary:** Counsel Forest background (`#1F4C3C`), Desk Paper text, `h-10 px-4 py-2` default sizing, `font-medium`
- **Hover / Focus:** primary hover fades to `forest-primary/90`; focus-visible gets a 2px forest ring with 2px offset, never a glow
- **Secondary / Ghost / Outline:** secondary uses Paper Fold background with Ink text; outline uses a Margin Line border on transparent background; ghost has no border/background until hover, then takes on `accent` tint
- **Destructive:** Filing Red background, reserved for irreversible actions only

### Cards / Containers
- **Corner Style:** rounded-lg (10px)
- **Background:** Desk Paper / white card surface
- **Shadow Strategy:** `card` at rest, `card-hover` on hover only (see Elevation)
- **Border:** 1px Margin Line
- **Internal Padding:** 24px (lg spacing step)

### Inputs / Fields
- **Style:** Margin Line border, Desk Paper/card background, rounded-md
- **Focus:** border shifts to Counsel Forest, 2px forest ring at 15% opacity, no glow or scale
- **Error:** border and helper text shift to Filing Red

### Navigation
- **Style:** fixed top nav, `background/95` with backdrop blur, 1px Margin Line bottom border. Nav items are Inter, muted-foreground at rest, full-ink on hover, no underline until active.

### Data / Record Display (signature)
Stats, case numbers, timestamps, and any "this is a real record" moment render in IBM Plex Mono at Label scale. This is the one place mono appears outside code, and it is what makes the product feel like it is handling real legal records rather than marketing copy.

## 6. Do's and Don'ts

### Do:
- **Do** keep the page background warm paper (`#F9F8F6`), never stark white or cold gray.
- **Do** use Counsel Forest as the only action/accent color; let brass appear at most once per screen.
- **Do** use Source Serif 4 only at heading scale (h1–h3); everything else is Inter or IBM Plex Mono.
- **Do** keep shadows flat at rest; only add `card-hover` in response to actual hover/focus interaction.
- **Do** use IBM Plex Mono for stats, case numbers, and timestamps so records read as precise, not decorative.
- **Do** respect `prefers-reduced-motion`: entrance animations already degrade to instant per the existing `@media` block; keep that pattern for any new motion.

### Don't:
- **Don't** use gradient blobs, glassmorphism, or blue/purple "AI startup" accent colors; PRODUCT.md names these directly as anti-references.
- **Don't** build hero-metric templates (big number, small label, gradient accent) as the default hero shape.
- **Don't** add tiny uppercase tracked eyebrows above every section, or numbered 01/02/03 scaffolding unless the content is a real, ordered sequence.
- **Don't** use `border-left`/`border-right` colored stripes as a card or callout accent.
- **Don't** let anything float permanently: no persistent shadow, glow, or "lifted" card at rest.
- **Don't** introduce a second saturated accent color alongside Counsel Forest; that breaks the One Accent Rule.
