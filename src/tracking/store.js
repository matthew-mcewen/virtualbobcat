'use strict';

// The only thing HTTP handlers touch -- a single in-process snapshot,
// atomically replaced once per poll cycle. Starts empty so the API never
// 500s before the first successful VATSIM fetch completes.
let snapshot = [];

function setSnapshot(records) {
  snapshot = records;
}

function getSnapshot() {
  return snapshot;
}

module.exports = { setSnapshot, getSnapshot };
