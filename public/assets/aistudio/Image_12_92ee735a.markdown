---
name: ClearSkies Visa
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#444651'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#3e2400'
  on-tertiary: '#ffffff'
  tertiary-container: '#5c3800'
  on-tertiary-container: '#ef9900'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 34px
    fontWeight: '800'
    lineHeight: 42px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a welcoming, radically transparent, and stress-free interface for complex global immigration, consular filing, and visa resolution. Legal processes often trigger anxiety and cognitive overload; this system counters that dread with effortless clarity, warmth, and quiet institutional confidence. It adheres strictly to the "10-year-old test": if an interface element, instruction, or status requires specialized bureaucratic vocabulary to comprehend, it has failed.

The aesthetic fuses **Tactile Warmth** with **Modern Soft-Minimalism**. It replaces dense governmental tables with conversational, card-driven milestones, elevated micro-badges, and approachable visual metaphors. High-contrast typography ensures rigorous legibility for diverse global travelers, first-time applicants, and non-native language speakers, while luminous accent tones communicate momentum, approval, and resolution.

## Colors

The palette balances bureaucratic authority with high-energy encouragement and absolute functional clarity.

- **Primary (`#1E3A8A` — Deep Passport Blue):** Represents institutional reliability, international authority, and secure documentation. Used for primary navigation, critical interactive controls, and anchor headings.
- **Secondary (`#10B981` — Embassy Mint):** Signifies clearance, successful verification, active validity, and positive resolution. Deployed for completion badges, success dialogues, and confirmed checklist tasks.
- **Tertiary (`#F59E0B` — Departure Amber):** Serves as an urgent yet friendly prompt for missing items, expiring deadlines, payment windows, and attention states.
- **Neutral (`#1E293B` — Slate Ink):** Yields high-contrast WCAG AAA compliance against snow surfaces without the optical harshness of pure black.

### Surface Tones & Canvases
- **Canvas Base:** `#F8FAFC` (Cool porcelain tint, reducing glare while maintaining crisp contrast).
- **Surface Elevation 1 (Card Default):** `#FFFFFF` (Pure white).
- **Surface Elevation 2 (Interactive/Focus):** `#F1F5F9`.
- **Soft Trust Indigo Accent:** `#4F46E5` (Dedicated to AI conversational bubbles, automated resolutions, and smart hints).

## Typography

The type system blends friendly, geometric clarity with technical precision.

- **Primary Headings & Body (`Plus Jakarta Sans`):** Features wide apertures, rounded counters, and robust letterforms that convey approachability without appearing juvenile. It remains clear at tiny sizes on lower-density displays.
- **Labels, Codes & Document Tokens (`JetBrains Mono`):** Deliberately monospaced for passport numbers, visa classification codes (e.g., `B1/B2`, `Schengen-C`), timestamp updates, tracking IDs, and file sizes. This gives users immediate optical distinction between dynamic consular data and human-readable instructional text.

### Composition Guidelines
- Keep line lengths for instructions between 45 and 65 characters to preserve focus.
- Avoid all-caps formatting for long sentences; restrict uppercase strictly to `label-sm` code tags and passport sequence tokens.

## Layout & Spacing

The layout structure relies on a strict **8px baseline rhythm** paired with a responsive fluid grid to prevent visual clutter during complex multi-step document uploads.

### Grid & Breakpoints
- **Mobile (< 640px):** Single-column stack with `margin: 1rem` and `gutter: 1rem`. Bottom sheets anchor conversational inputs, chat trays, and instant actions.
- **Tablet (640px - 1024px):** 6-column fluid grid with `margin: 1.5rem` and `gutter: 1.25rem`. Main step-flow consumes 4 columns; status summary occupies 2 columns.
- **Desktop (> 1024px):** 12-column fixed-max grid (capped at `1200px`) centered on viewport, `margin: 2.5rem`, `gutter: 1.5rem`. Chat resolution companion pins to a persistent 4-column right rail, leaving 8 columns for application records and checklists.

### Layout Rules
- Interactive inputs must provide a minimum tap target of `48px` vertically.
- Group input controls and their immediate helper text with `space-xs` (4px).
- Separate discrete form groups or document requirements with `space-lg` (24px) to avoid cognitive fatigue.

## Elevation & Depth

Visual depth is communicated through **ambient chromatic diffusion** and clean surface tiers rather than harsh drop shadows. This creates a gentle, calm aesthetic reminiscent of a physical passport booklet resting on clean paper.

### Depth Levels
- **Level 0 (Canvas):** Pure `#F8FAFC`. Zero elevation.
- **Level 1 (Cards, Checklist Containers, Inactive Blocks):** White `#FFFFFF` with a soft border (`1px solid rgba(226, 232, 240, 0.8)`) and an ultra-diffused shadow: `0 4px 16px -2px rgba(30, 58, 138, 0.04)`.
- **Level 2 (Active Cards, Popovers, Floating Chat Bubbles):** Raised white background with layered ambient glow: `0 8px 24px -4px rgba(30, 58, 138, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.02)`.
- **Level 3 (Modals, Urgent Consular Action Sheets):** `0 20px 40px -8px rgba(15, 23, 42, 0.12)`.
- **Level 4 (AI Assist Spotlight):** Subtle dynamic edge glow utilizing `0 0 0 2px rgba(79, 70, 229, 0.2), 0 12px 32px -4px rgba(79, 70, 229, 0.12)`.

## Shapes

The interface embraces a friendly, tactile geometry (`roundedness: 2`). Standard containers, cards, and input fields feature `0.5rem` (8px) corners. Larger modules, interactive dialogs, and conversational pods scale to `rounded-lg` (`1rem` / 16px) and `rounded-xl` (`1.5rem` / 24px).

Pill radii (`rounded-full`) are reserved exclusively for status micro-badges, category tags, step indicators, and avatar wrappers. This geometric hierarchy provides an instant cue: pill shapes indicate immutable state or category descriptors, while rounded rectangles indicate actionable cards, dropzones, and text entry fields.

## Components

### Buttons
- **Primary Action (Direct Resolution):** Deep Passport Blue (`#1E3A8A`) background, `#FFFFFF` text, `0.5rem` radius, `48px` height, font weight `600`. Subtle hover state deepens to `#172554`.
- **Secondary Action (Verification/Save):** Soft mint wash (`#ECFDF5`) with green text (`#065F46`), border `1px solid #A7F3D0`.
- **Tertiary/Ghost (Assistance/Explain):** Transparent background, slate text (`#475569`), underline-on-hover with `JetBrains Mono` helper tag.

### Chips & Micro-Badges
- **Status Micro-Badges:** Ultra-compact pill components for real-time tracking:
  - *Approved / Ready:* Green fill (`#D1FAE5`), dark green text (`#065F46`), leading with a 6px solid emerald dot.
  - *Action Required / Review:* Amber fill (`#FEF3C7`), amber text (`#92400E`), leading with a subtle exclamation icon.
  - *In Embassy Queue:* Indigo wash (`#EEF2FF`), indigo text (`#3730A3`).
- **Typography:** Always set in `label-sm` (`JetBrains Mono`).

### Conversational UI & AI Prompts
- **Assistant Chat Bubble:** Tinted in soft trust indigo (`#F5F3FF`), border `1px solid #E0E7FF`, `rounded-xl` with bottom-left corner tightened to `0.25rem`.
- **User Response Bubble:** White `#FFFFFF`, border `1px solid #E2E8F0`, `rounded-xl` with bottom-right corner tightened to `0.25rem`.
- **"Explain Like I'm 10" Micro-Trigger:** Small floating button alongside legal requirements that triggers an instant jargon-free accordion modal.

### Input Fields & Document Dropzones
- **Inputs:** `48px` tall, border `1.5px solid #CBD5E1`, surface `#FFFFFF`. On focus: border shifts to `#1E3A8A` with a `0 0 0 3px rgba(30, 58, 138, 0.15)` ring.
- **Document Dropzones:** Dashed border (`2px dashed #94A3B8`), surface `#F8FAFC`, containing a large friendly passport/camera illustration, accompanied by human-centric drag-and-drop instructions ("Drop passport photo here, or take a picture with your phone").

### Lists & Checklists
- Items are presented as distinct stacked cards with `space-sm` gaps, rather than raw divider-separated lines.
- Left-aligned check target: custom `24px` rounded square checkbox (`rounded: 6px`) turning solid `#10B981` upon document upload validation.

### Cards
- Standard record cards use Level 1 elevation, `1.5rem` inner padding, and clear typographic hierarchy. Card headers pair bold plain-language titles ("Your Travel Details") with monospaced metadata ("FORM-DS-160") for balanced approachability and rigor.