/**
 * Calculates utility bill based on consumption units, tariff slabs, and fixed charges.
 * Implements progressive slab-wise billing (like real-world electricity boards).
 *
 * Example:
 * Slabs: 0-100 @ 3, 101-200 @ 5, 201-500 @ 7, 501+ @ 10, Fixed: 100
 * Consumption: 250 units
 *   Slab 1 (0-100):   100 units * 3  = 300
 *   Slab 2 (101-200): 100 units * 5  = 500
 *   Slab 3 (201-500):  50 units * 7  = 350
 *   Energy Charge = 1150
 *   Fixed Charge = 100
 *   Total = 1250
 *
 * @param {number} units - Units consumed (must be >= 0)
 * @param {Array} tariffSlabs - Array of slab objects: [{ from, to, rate }]
 * @param {number} fixedCharge - Monthly fixed charge
 * @returns {Object} { unitsConsumed, energyCharge, fixedCharge, totalAmount, breakdown }
 */
function calculateBill(units, tariffSlabs, fixedCharge = 0) {
  const unitsConsumed = Math.max(0, Number(units) || 0);
  const fixed = Number(fixedCharge) || 0;

  // Clone and sort slabs by 'from' ascending
  const sortedSlabs = [...tariffSlabs].sort((a, b) => a.from - b.from);

  let remainingUnits = unitsConsumed;
  let energyCharge = 0;
  const breakdown = [];

  for (let i = 0; i < sortedSlabs.length; i++) {
    const slab = sortedSlabs[i];
    const slabMin = slab.from;
    const slabMax = slab.to; // null/undefined means infinity
    const rate = slab.rate;

    if (remainingUnits <= 0 && unitsConsumed > 0) {
      break;
    }

    // Capacity of this slab tier
    let slabCapacity;
    if (slabMax === null || slabMax === undefined) {
      slabCapacity = Infinity;
    } else {
      // e.g. 0 to 100 -> capacity 100; 101 to 200 -> capacity 100
      // If slabMin is 101 and slabMax is 200, capacity is (200 - 101 + 1) = 100
      // If slabMin is 0 and slabMax is 100, capacity is 100
      slabCapacity = slabMin === 0 ? slabMax : (slabMax - slabMin + 1);
    }

    const unitsInThisSlab = Math.min(remainingUnits, slabCapacity);
    const amountForSlab = unitsInThisSlab * rate;

    const slabLabel = slabMax === null || slabMax === undefined
      ? `${slabMin}+ units`
      : `${slabMin}–${slabMax} units`;

    if (unitsInThisSlab > 0 || unitsConsumed === 0) {
      breakdown.push({
        slabRange: slabLabel,
        unitsBilled: unitsInThisSlab,
        rate: rate,
        amount: Math.round(amountForSlab * 100) / 100
      });
    }

    energyCharge += amountForSlab;
    remainingUnits -= unitsInThisSlab;
  }

  // Round values cleanly
  const roundedEnergy = Math.round(energyCharge * 100) / 100;
  const roundedTotal = Math.round((roundedEnergy + fixed) * 100) / 100;

  return {
    unitsConsumed,
    energyCharge: roundedEnergy,
    fixedCharge: fixed,
    surcharge: 0,
    totalAmount: roundedTotal,
    breakdown
  };
}

module.exports = { calculateBill };
