// Shared color tokens for the SVM visualizations, kept in one place so a brand
// change is a single edit. POS/NEG are the two data classes; ACCENT is Klein
// Blue, reserved for interactive controls and the decision geometry the user
// manipulates. Mirrors the Tailwind palette (ink / interactive) plus the
// terracotta used for the positive class.
export const POS = '#C0492B'; // class +1
export const NEG = '#222222'; // class -1 (ink)
export const ACCENT = '#002FA7'; // Klein blue (interactive)
export const AXIS = '#E2E0D8'; // static axes / gridlines
export const PAPER = '#F4F3EF'; // background (paper)
