'use strict';

const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const config = {
  navdataDir: process.env.NAVDATA_DIR ? path.resolve(process.env.NAVDATA_DIR) : repoRoot,
  port: Number(process.env.PORT) || 3000,
  pollIntervalMs: Number(process.env.VATSIM_POLL_MS) || 180000,
  airborneKts: 150,
  exclusionGraceMs: Number(process.env.EXCLUSION_GRACE_MS) || 3600000,
  lonExclusionDeg: 57,
  vatsimDataUrl: 'https://data.vatsim.net/v3/vatsim-data.json',
  // How many consecutive poll cycles a tracked flight may be absent from the
  // datafeed before it's pruned (handles logoffs that never hit the ETOP/lon
  // exclusion rules).
  staleAfterCycles: 2,
};

module.exports = config;
