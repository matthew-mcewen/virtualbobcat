'use strict';

const { METERING_POINTS, buildAirwayRegex } = require('./meteringPoints');

const IN_SCOPE_FIRST_LETTERS = new Set(['R', 'V', 'W', 'Z', 'Y', 'N', 'A']);

function isInScopeDeparture(departureIcao) {
  if (!departureIcao) return false;
  return IN_SCOPE_FIRST_LETTERS.has(departureIcao.charAt(0).toUpperCase());
}

const meteringPointMatchers = METERING_POINTS.map((mp) => ({
  ident: mp.ident,
  regexes: mp.requiredAirways.map(buildAirwayRegex),
}));

// Priority-ordered: returns the first metering point whose required airway
// set is all present in the route string. A route should only ever satisfy
// one in practice.
function matchMeteringPoint(routeString) {
  if (!routeString) return null;

  for (const matcher of meteringPointMatchers) {
    if (matcher.regexes.every((re) => re.test(routeString))) {
      return matcher.ident;
    }
  }
  return null;
}

module.exports = { isInScopeDeparture, matchMeteringPoint, IN_SCOPE_FIRST_LETTERS };
