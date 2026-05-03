/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Slot display id: `C` = carrier (1 = left, 8 = right), `P` = position on that
 * carrier (1 = first index in layout order, back → front along the carrier).
 */
export function getSlotLabel(slotId: number): string {
  let carrierIndex = 0;
  let positionInCarrier = 0;
  if (slotId < 12) {
    carrierIndex = Math.floor(slotId / 4);
    positionInCarrier = slotId % 4;
  } else if (slotId < 27) {
    const rem = slotId - 12;
    carrierIndex = 3 + Math.floor(rem / 5);
    positionInCarrier = rem % 5;
  } else {
    const rem = slotId - 27;
    carrierIndex = 6 + Math.floor(rem / 4);
    positionInCarrier = rem % 4;
  }
  return `C${carrierIndex + 1}P${positionInCarrier + 1}`;
}
