// Single source of color tokens for every visualization and UI primitive — a
// rebrand is one edit here. The "Ink & Copper" palette: a warm off-white paper,
// an ink-blue accent reserved for interactive geometry and primary actions, and a
// copper/slate pair for the two data classes. State colors (success/warn) and a
// warm neutral ramp support feedback, progress, and surfaces.
//
// Keep these export NAMES stable: 12 components import POS/NEG/ACCENT/AXIS/PAPER.

// --- data classes ---------------------------------------------------------
export const POS = '#B5532A'; // class +1 — copper
export const NEG = '#3B4252'; // class -1 — slate

// --- brand / interaction --------------------------------------------------
export const ACCENT = '#1A3A6B'; // ink blue — interactive controls, CTAs, decision geometry
export const ACCENT_SOFT = '#2C5494'; // hover/lighter accent
export const INK = '#1F1D1B'; // warm near-black — primary text

// --- surfaces (warm off-white) --------------------------------------------
export const PAPER = '#F5F3EE'; // base background (never pure white)
export const PAPER_RAISED = '#FBFAF6'; // cards / elevated surfaces

// --- state ----------------------------------------------------------------
export const SUCCESS = '#2E7D52'; // checkmarks, completion, milestones
export const WARN = '#B7791F'; // warnings / attention

// --- neutrals (warm gray ramp) --------------------------------------------
export const AXIS = '#CFC9BA'; // static axes / gridlines
export const BORDER = '#E3DFD4'; // hairline borders / dividers
export const MUTED = '#7A756B'; // secondary text / labels
