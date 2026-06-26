---
name: ui-ux
description: Apply UI/UX best practices when building or improving any user interface — visual design, layout, components, feedback, animations/micro-interactions, perceived speed, progress/completion UI, accessibility, or making an interface "more attractive / more usable / more delightful". Use when writing or reviewing frontend components (HTML/CSS, React/Svelte/Vue, Tailwind), designing color palettes or visual hierarchy, adding loading/empty/error states, or whenever the user wants feedback to feel immediate and satisfying.
---

# UI/UX best practices

Operational rules distilled from the Laws of UX and their primary sources (NN/g,
IxDF, Smashing) plus modern micro-interaction guidance. This is the **how**; the
**why** (definitions, origins, citations) lives in the companion research doc —
when this skill ships inside a project, look for `docs/ui-ux-principles.md`.

Guiding formula: **utility + usability + desirability**. Utility is the reason,
usability removes friction, desirability turns *use* into *preference*.

Aesthetic-Usability Effect (the core bet): users perceive attractive interfaces as
more usable, **forgive more errors**, and **persist longer**. Aesthetics in serious
products is not decoration — it is functional investment with real return. So
polish is never "just polish."

---

## 1. Immediate, satisfying feedback

Every user action gets an instant visual response. Click → something moves,
changes color, or confirms.

- Respond within **400 ms** (Doherty Threshold); micro-interactions feel best at
  **0.1–0.3 s**. Past that, fake speed (see §2).
- Define `:hover`, `:active`, and `:focus-visible` on every interactive element —
  consistently. A button with no state change reads as broken.
- Transitions **150–300 ms** with **natural easing** (ease-out / cubic; never
  linear — linear feels robotic).
- Place feedback **near the trigger** (the thing that changed, not a far corner).
- Forgive input (Postel's Law): accept extra spaces, varied case/format; normalize
  internally; show clear, specific errors — never punish a near-miss.

## 2. Perceived speed

Fast things feel better than slow things. Optimize First Contentful Paint,
Time-to-Interactive, and the response to every input.

- **< 1 s:** show nothing (a flashed spinner is worse than no spinner).
- **2–10 s:** spinner for a single module; **skeleton** for a full page (it
  previews the shape and lowers cognitive load). Avoid header/footer-only
  skeletons — they read as "broken."
- **> 10 s:** progress bar (conveys system state; accuracy is secondary).
- Use **optimistic UI** when the outcome is predictable: update immediately,
  reconcile after.
- **Reserve space** before content loads → no layout shift (low CLS). Layout jumps
  destroy the feeling of fluidity.

## 3. Visible progress

The brain is wired to chase progress. Use it honestly.

- Completion bars, checkmarks, streaks — where they serve the user's goal.
- **Endowed progress** (Goal-Gradient): start with some progress already shown; a
  bar at 20% pulls harder than one at 0%.
- Surface the *remaining* step (Zeigarnik): "1 section left" invites completion.
- **Persist** progress (e.g. localStorage) so returning users keep their place.

## 4. Micro-celebrations

Small animations when something is completed. Subtle — not exaggerated.

- Fire on **real milestones** (task done, perfect score) — a memorable peak
  (Peak-End Rule). The *end* of a flow disproportionately shapes the memory.
- Subtle and brief: a scale-pop, a drawn checkmark, a light confetti burst. Match
  the product's tone — restrained for serious products.
- **Once per achievement**, never looping.
- **Always** gate on `prefers-reduced-motion: reduce` — provide a static fallback.

## 5. Clear visual hierarchy (aesthetics as function)

A clear hierarchy reduces cognitive load; generous spacing aids scanning; color
used with intention guides attention. These make data *easier to process*, not
just prettier.

- **Group** with Gestalt: proximity (spacing within a group, more gap between
  groups), common region (cards/containers), similarity (same look = same
  function), uniform connectedness.
- **Make the primary action stand out** (Von Restorff) — by size/contrast/color —
  but sparingly. If everything stands out, nothing does.
- **Targets** large and close to the user's focus (Fitts); comfortable touch
  size, well spaced.
- **Chunk** content (Miller 7±2) into scannable units; key items at the **start
  and end** of lists/nav (Serial Position).
- Generous **whitespace** is not waste — it is focus.

## 6. Absence of friction

Every extra click is debt. Every unnecessary modal is debt. Every confirmation
that asks something obvious is debt.

- Fewer choices per screen (Hick / Choice Overload); sensible **defaults**;
  highlight the recommended option.
- The **system absorbs irreducible complexity** (Tesler), not the user.
- Cut superfluous elements (extraneous cognitive load) and unnecessary steps.
- Use **standard patterns** (Jakob's Law) — users expect your UI to work like
  every other site's. Innovate on value, not on relearning the controls.
- "Don't make me think": the obvious path should be the easy path.

## 7. Accessibility (non-negotiable)

- Contrast **WCAG AA** minimum (4.5:1 body text, 3:1 large text).
- Visible focus; full keyboard navigation.
- **Never rely on color alone** to convey meaning (add icon/text/shape).
- `aria-live` for dynamic updates (a result, a milestone announcement).
- Respect `prefers-reduced-motion`.

## 8. Ethics

No dark patterns. Persuasion (streaks, progress, variable reward) is legitimate
**only when it serves the user**. For serious products — education, BI, finance,
tools — the goal is the user reaching their objective and leaving satisfied, not
maximizing time-on-app.

---

## Quick checklist

```
Feedback     hover/active/focus-visible on all controls · <400ms · 150–300ms ease-out
Speed        FCP/TTI · skeleton 2–10s, progress >10s · optimistic UI · no CLS
Progress     bars/checkmarks/streaks · endowed start · persist
Celebrate    real milestones · subtle · once · prefers-reduced-motion
Hierarchy    Gestalt grouping · CTA stands out (sparingly) · big/near targets · whitespace
Friction     fewer choices · defaults · no needless modals · system absorbs complexity
A11y         WCAG AA · keyboard · focus · not color-alone · aria-live
Ethics       no dark patterns
```

## Applying in a component stack (example: Astro + Svelte + Tailwind)

The principles are framework-agnostic; this is one concrete mapping.

- **One source of color tokens.** Keep palette/state colors in a single module and
  import everywhere — a rebrand is then one edit. No hex literals scattered in
  markup.
- **Animate with the framework's primitives** (e.g. Svelte `Tween`/transitions,
  CSS transitions) — no animation library needed for micro-interactions. When a
  tween and a slider drive the same value, make the **tween the single source of
  truth** (the slider reads/writes it) to avoid desync.
- **Reduced motion globally:** one `@media (prefers-reduced-motion: reduce)` block
  that neutralizes animations app-wide, plus per-component static fallbacks.
- **Skeletons for islands:** show a shimmer placeholder before a hydrating
  component paints, sized to match (avoids CLS).
- **Persist progress** with `localStorage` (a browser API — not a state library or
  backend), guarded for SSR (`typeof localStorage !== 'undefined'`).
