'use strict';

const { haversineDistanceNm } = require('../geo/greatCircle');

// When a route token's ident exists in multiple regions, prefer whichever
// match is closest to the last resolved vertex (or the departure airport for
// the very first token).
function pickClosestFix(matches, referencePoint) {
  if (matches.length === 1) return matches[0];
  if (!referencePoint) return matches[0];

  let best = matches[0];
  let bestDist = haversineDistanceNm(referencePoint, best);
  for (let i = 1; i < matches.length; i += 1) {
    const dist = haversineDistanceNm(referencePoint, matches[i]);
    if (dist < bestDist) {
      best = matches[i];
      bestDist = dist;
    }
  }
  return best;
}

// Labels each route token as a WAYPOINT (resolved fix), AIRWAY (known
// designator), or UNKNOWN (SID/STAR name, typo, or anything not in navdata --
// simply ignored downstream).
function classifyTokens(tokens, navdata, referenceStart) {
  const { fixIndex, airwayStore } = navdata;
  const classified = [];
  let lastVertex = referenceStart || null;

  for (const raw of tokens) {
    const fixMatches = fixIndex.lookupByIdentAny(raw);

    if (fixMatches.length > 0) {
      const chosen = pickClosestFix(fixMatches, lastVertex);
      const resolved = {
        ident: chosen.ident,
        region: chosen.region,
        lat: chosen.lat,
        lon: chosen.lon,
      };
      classified.push({ type: 'WAYPOINT', raw, resolved });
      lastVertex = resolved;
      continue;
    }

    if (airwayStore.getAirway(raw)) {
      classified.push({ type: 'AIRWAY', raw, resolved: { name: raw } });
      continue;
    }

    classified.push({ type: 'UNKNOWN', raw, resolved: null });
  }

  return classified;
}

module.exports = { classifyTokens };
