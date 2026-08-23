'use strict';

// altitude, rounded to nearest 1000ft then divided by 100 -> FLxxx (e.g. 34500 -> 350).
function roundFl(altitudeFt) {
  if (altitudeFt == null) return null;
  return Math.round(altitudeFt / 1000) * 10;
}

function toIso(epochMs) {
  return epochMs != null ? new Date(epochMs).toISOString() : null;
}

function toSummaryDto(record) {
  return {
    adep: record.adep,
    acid: record.callsign,
    fl: roundFl(record.altitude),
    meteringPoint: record.meteringPoint,
    etop: toIso(record.etopBlended),
  };
}

function toDetailDto(record) {
  return {
    ...toSummaryDto(record),
    airborne: record.airborne,
    atot: toIso(record.atot),
    distanceRemainingNm: record.distanceRemainingNm,
    etopFromSpeed: toIso(record.etopFromSpeed),
    etopFromEet: toIso(record.etopFromEet),
    etopBlended: toIso(record.etopBlended),
  };
}

module.exports = { toSummaryDto, toDetailDto, roundFl };
