'use strict';

const config = require('../config');

async function fetchVatsimData() {
  const response = await fetch(config.vatsimDataUrl);
  if (!response.ok) {
    throw new Error(`VATSIM datafeed request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

module.exports = { fetchVatsimData };
