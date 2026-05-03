/**
 * Shared deck / carrier colors so the base slab, carrier deck skin, and UI stay in sync.
 */

/** Visible deck surface: strips between carriers, between-slot gaps on each carrier, and base slab. */
export const DECK_BETWEEN_CARRIERS = '#9a9a9a';
/** Tilt-module slots (F2, F3): fuller grey fill — pad + rim + corners in one grey range. */
export const TILT_DECK_LIGHT_GREY = '#929292';
export const TILT_DECK_RIM_GREY = '#7d7d7d';
export const TILT_DECK_CORNER_GREY = '#6b6b6b';
export const CARRIER_CHARCOAL = '#2b2b2b';
/** Under elevated carriers D–F — cool grey-blue accent. */
export const UNDER_PANEL_COLOR_CARRIERS_D_TO_F = '#b0c4de';
/** Under elevated carriers G–H — neutral grey (no blue tint). */
export const UNDER_PANEL_COLOR_CARRIERS_G_TO_H = '#b0b0b0';
export const DECK_GUIDE_LINE = '#666666';
export const LEG_COLOR = '#111111';

/**
 * Vertical lift for all elevated carriers D–H (indices 3–7).
 * Must stay in sync with `Deck` geometry and `calculateSlotPosition`.
 */
export const ELEVATED_CARRIER_LIFT = 20;

export function carrierLiftForIndex(carrierIndex: number): number {
  if (carrierIndex < 3) return 0;
  return ELEVATED_CARRIER_LIFT;
}
