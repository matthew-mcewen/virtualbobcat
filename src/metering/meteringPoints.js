'use strict';

const METERING_POINTS = [
  { ident: 'LAJAK', requiredAirways: ['M875', 'L509'] },
  { ident: 'DOBAT', requiredAirways: ['N644'] },
  { ident: 'BIROS', requiredAirways: ['L750'] },
  { ident: 'ASLUM', requiredAirways: ['P628'] },
  { ident: 'SERKA', requiredAirways: ['UL333'] },
];

const METERING_POINT_IDENTS = METERING_POINTS.map((mp) => mp.ident);

// Whole-token match so e.g. "L509" doesn't false-positive on "L5099".
function buildAirwayRegex(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`);
}

module.exports = { METERING_POINTS, METERING_POINT_IDENTS, buildAirwayRegex };
