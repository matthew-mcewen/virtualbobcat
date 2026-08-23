'use strict';

function createInitialState(callsign, cid, meteringPoint) {
  return {
    callsign,
    cid,
    meteringPoint,
    airborne: false,
    atot: null,
    lastSeenAt: Date.now(),
    lastKnownEtop: null,
    missedCycles: 0,
  };
}

// Records ATOT only on the false -> true transition; once set, ATOT is kept
// for the flight's lifetime in the tracker's Map.
function updateAirborneTransition(state, groundspeedKt, now, airborneThresholdKt) {
  const isAirborneNow = groundspeedKt >= airborneThresholdKt;

  if (isAirborneNow && !state.airborne) {
    state.atot = now;
  }

  state.airborne = isAirborneNow;
  return state;
}

module.exports = { createInitialState, updateAirborneTransition };
