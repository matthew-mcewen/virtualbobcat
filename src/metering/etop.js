'use strict';

// Reference speed is groundspeed only when: airborne, groundspeed deviates
// >5% from filed TAS, AND altitude is at/above the filed cruise level.
// Otherwise falls back to filed TAS. Returns an epoch-ms timestamp.
function computeEtopFromSpeed({
  airborne,
  groundspeedKt,
  plannedTasKt,
  altitudeFt,
  filedCruiseFt,
  remainingDistanceNm,
  now,
}) {
  if (remainingDistanceNm === null || remainingDistanceNm === undefined) return null;
  if (!plannedTasKt || plannedTasKt <= 0) return null;

  let refSpeed = plannedTasKt;

  if (airborne && groundspeedKt > 0) {
    const deviatesEnough = Math.abs(groundspeedKt - plannedTasKt) > 0.05 * plannedTasKt;
    const atOrAboveCruise = filedCruiseFt != null && altitudeFt >= filedCruiseFt;
    if (deviatesEnough && atOrAboveCruise) {
      refSpeed = groundspeedKt;
    }
  }

  if (refSpeed <= 0) return null;

  const hoursToGo = remainingDistanceNm / refSpeed;
  return now + hoursToGo * 3600 * 1000;
}

// Only computable once ATOT is known and an EET pair exists for this flight.
function computeEtopFromEet({ atot, eetSeconds }) {
  if (atot == null || eetSeconds == null) return null;
  return atot + eetSeconds * 1000;
}

// Prefers a metering-point-specific EET pair over the generic OAKX one.
function pickEetSeconds(eetMap, meteringPointIdent) {
  if (!eetMap) return null;
  if (eetMap[meteringPointIdent] != null) return eetMap[meteringPointIdent];
  if (eetMap.OAKX != null) return eetMap.OAKX;
  return null;
}

// Blended average of whichever ETOP values are available.
function blendEtop(etopFromSpeed, etopFromEet) {
  if (etopFromSpeed != null && etopFromEet != null) {
    return (etopFromSpeed + etopFromEet) / 2;
  }
  return etopFromSpeed ?? etopFromEet ?? null;
}

module.exports = { computeEtopFromSpeed, computeEtopFromEet, pickEetSeconds, blendEtop };
