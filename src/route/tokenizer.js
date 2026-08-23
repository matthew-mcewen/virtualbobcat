'use strict';

// Splits a VATSIM route string into raw tokens, stripping inline
// speed/level-change annotations (e.g. "TAPIS/N0450F370" -> "TAPIS") and
// dropping "DCT" filler tokens (a direct leg is just two adjacent waypoints
// with nothing to expand between them).
function parseRouteString(routeStr) {
  if (!routeStr) return [];

  return routeStr
    .trim()
    .split(/\s+/)
    .map((token) => token.split('/')[0])
    .filter((token) => token && token !== 'DCT');
}

module.exports = { parseRouteString };
