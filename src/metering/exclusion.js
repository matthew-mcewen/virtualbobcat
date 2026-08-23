'use strict';

const config = require('../config');

// Excluded once now > lastKnownEtop + 1h, OR longitude has crossed west of
// 57°E -- whichever comes first.
function shouldExclude(flightState, now, currentLongitude) {
  if (flightState.lastKnownEtop != null && now > flightState.lastKnownEtop + config.exclusionGraceMs) {
    return true;
  }
  if (currentLongitude != null && currentLongitude < config.lonExclusionDeg) {
    return true;
  }
  return false;
}

module.exports = { shouldExclude };
