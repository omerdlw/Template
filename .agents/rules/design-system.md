# Tvizzie Agent Guidelines & Design System Rules

These rules are STRICT and MANDATORY for all AI assistants and developers modifying this codebase. Always adhere to these rules without exception.

---

## 1. Opacity Scale Rules

- **NEVER use arbitrary/bracket opacities** such as `bg-white/[0.02]`, `bg-white/[0.03]`, `hover:bg-white/[0.08]`, `opacity-[0.4]`, etc.
- **White Opacities:** Only use the standard scale variants: `/5`, `/10`, `/15`, `/50`, `/70`, `/100` (or pure `white`).
  - `/5`, `/10`, `/15`: Background tints, card surfaces, subtle borders.
  - `/50`: Muted text, secondary captions, metadata labels, placeholders, disabled states.
  - `/70`: Primary body text, interactive elements in default state, subtitles.
  - `/100` / `text-white`: Active states, high-contrast headings, highlighted text.
- **Black Opacities:** Only use the standard scale variants: `/5`, `/10`, `/20`, `/60`, `/80`, `/100` (or pure `black`).
  - `/10`, `/20`: Subtle dark borders and shadows.
  - `/60`, `/80`: Modal backdrops, gradient overlays, dark pills.

---

## 2. Typography Scale Rules

- **NEVER use arbitrary pixel or rem font sizes** such as `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[14px]`, `text-[15px]`, `text-[16px]`, `text-[19px]`, `text-[1.02rem]`, etc.
- **Always use standard Tailwind typography scale variants:**
  - `text-xs` (12px): Badges, chips, tags, timestamps, uppercase labels, counts, small button labels.
  - `text-sm` (14px): Secondary descriptions, list item details, standard button labels, form inputs.
  - `text-base` (16px): Main body text, primary card titles, section subtitles.
  - `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`, `text-5xl`: Headings, modal titles, page hero titles.

---

## 3. Letter Spacing (Tracking) Rules

- **NEVER use any `tracking-*` classes** (`tracking-tight`, `tracking-wide`, `tracking-wider`, `tracking-widest`, `tracking-[...]`, etc.).
- Letter spacing is managed globally in font definitions and must NEVER be overridden with utility classes.

---

## 4. Interactive Surfaces & State Standardization

- **Default / Muted Interactive State (cards, pills, chips, buttons, tabs, interactive rows):**
  `ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:text-white hover:bg-white/10`
- **Active / Selected State:**
  `ring-1 ring-inset ring-white/10 bg-white/10 text-white hover:bg-white/15`

---

## 5. UI Primitives & Image Components

- **Form Elements:** NEVER use raw HTML `<button>`, `<input>`, `<textarea>`, `<select>`. Always import and use from `@/ui/primitives`:
  - `import { Button, Input, Textarea, Select, Checkbox, Tooltip } from "@/ui/primitives";`
- **Images:** NEVER use raw HTML `<img>` or `next/image` `<Image>`. Always import and use from `@/ui/components/adaptive-image`:
  - `import AdaptiveImage from "@/ui/components/adaptive-image";`

---

## 6. Copywriting & Punctuation Rules

- **NEVER use trailing periods (`.`) in sentences displayed to the user or developer:**
  - UI labels, descriptions, subtitles, empty states, placeholders, tooltips, dialogs, badges, and notification toasts must NEVER end with a period.
  - Developer-facing logs, warnings, and thrown error messages must NEVER end with a period.
  - *Example:* `This title is not currently available to stream, rent, or buy on digital platforms` (NOT `...platforms.`)
