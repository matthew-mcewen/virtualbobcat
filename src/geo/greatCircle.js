'use strict';

const R_NM = 3440.065;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function haversineDistanceNm(p1, p2) {
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);
  const dLat = toRad(p2.lat - p1.lat);
  const dLon = toRad(p2.lon - p1.lon);

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_NM * c;
}

function initialBearingRad(p1, p2) {
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);
  const dLon = toRad(p2.lon - p1.lon);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.atan2(y, x);
}

// Spherical cross-track distance: how far `point` sits off the great-circle
// segment from segStart toward segEnd (positive = right of track).
function crossTrackDistanceNm(point, segStart, segEnd) {
  const d13 = haversineDistanceNm(segStart, point) / R_NM;
  const theta13 = initialBearingRad(segStart, point);
  const theta12 = initialBearingRad(segStart, segEnd);
  return Math.asin(clamp(Math.sin(d13) * Math.sin(theta13 - theta12), -1, 1)) * R_NM;
}

// Spherical along-track distance: how far along the segStart->segEnd track
// the projection of `point` falls.
function alongTrackDistanceNm(point, segStart, segEnd) {
  const d13 = haversineDistanceNm(segStart, point) / R_NM;
  if (d13 < 1e-12) return 0;

  const crossTrack = crossTrackDistanceNm(point, segStart, segEnd) / R_NM;
  const ratio = clamp(Math.cos(d13) / Math.cos(crossTrack), -1, 1);
  return Math.acos(ratio) * R_NM;
}

// Projects `point` onto the segment [segStart, segEnd]. `fractionAlong` in
// [0,1] means the projection falls within the segment; <0 means before
// segStart, >1 means past segEnd.
function projectPointOntoSegment(point, segStart, segEnd) {
  const segmentLengthNm = haversineDistanceNm(segStart, segEnd);
  const crossTrackNm = crossTrackDistanceNm(point, segStart, segEnd);
  const alongTrackNm = alongTrackDistanceNm(point, segStart, segEnd);
  const fractionAlong = segmentLengthNm > 0 ? alongTrackNm / segmentLengthNm : 0;

  return { alongTrackNm, crossTrackNm, segmentLengthNm, fractionAlong };
}

module.exports = {
  R_NM,
  toRad,
  toDeg,
  haversineDistanceNm,
  initialBearingRad,
  crossTrackDistanceNm,
  alongTrackDistanceNm,
  projectPointOntoSegment,
};
