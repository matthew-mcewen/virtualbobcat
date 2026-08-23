'use strict';

const EET_MARKER = /EET\//i;
const PAIR_PATTERN = /^([A-Z0-9]{2,7})(\d{4})$/;

function hhmmToSeconds(hhmm) {
  const hours = Number(hhmm.slice(0, 2));
  const minutes = Number(hhmm.slice(2, 4));
  return hours * 3600 + minutes * 60;
}

// Parses the "EET/IDENT0130 IDENT20245 ..." block from flight plan remarks:
// consecutive IDENT+HHMM pairs immediately after the EET/ marker, stopping
// at the first token that doesn't match the pattern (the start of the next
// remark field, e.g. "RMK/"). Returns {ident -> durationSeconds}.
function parseEetRemarks(remarksText) {
  const result = {};
  if (!remarksText) return result;

  const markerMatch = EET_MARKER.exec(remarksText);
  if (!markerMatch) return result;

  const afterMarker = remarksText.slice(markerMatch.index + markerMatch[0].length);
  const tokens = afterMarker.trim().split(/\s+/);

  for (const token of tokens) {
    const pairMatch = PAIR_PATTERN.exec(token);
    if (!pairMatch) break;

    const [, ident, hhmm] = pairMatch;
    result[ident] = hhmmToSeconds(hhmm);
  }

  return result;
}

module.exports = { parseEetRemarks, hhmmToSeconds };
