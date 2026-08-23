'use strict';

// Handles "FL350", "F350", "35000", or a plain number. Values under 1000
// after stripping letters are assumed to be a flight level (x100 ft).
function normalizeAltitudeToFeet(raw) {
  if (raw === null || raw === undefined) return null;

  const digits = String(raw).trim().toUpperCase().replace(/[^0-9]/g, '');
  if (!digits) return null;

  const value = Number(digits);
  if (Number.isNaN(value) || value <= 0) return null;

  return value < 1000 ? value * 100 : value;
}

function nmToMeters(nm) {
  return nm * 1852;
}

module.exports = { normalizeAltitudeToFeet, nmToMeters };
