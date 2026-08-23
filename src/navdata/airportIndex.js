'use strict';

const { readDatLines } = require('./datFileReader');
const { getAirportPath } = require('./paths');

class AirportIndex {
  constructor() {
    this.byIdent = new Map();
  }

  add(ident, lat, lon) {
    if (this.byIdent.has(ident)) return;
    this.byIdent.set(ident, { lat, lon });
  }

  getAirport(ident) {
    return this.byIdent.get(ident);
  }
}

async function loadAirportIndex(filePath = getAirportPath()) {
  const index = new AirportIndex();
  let count = 0;

  for await (const tokens of readDatLines(filePath, { minTokens: 10 })) {
    const ident = tokens[0];
    const lat = Number(tokens[2]);
    const lon = Number(tokens[3]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;

    index.add(ident, lat, lon);
    count += 1;
  }

  return { index, count };
}

module.exports = { AirportIndex, loadAirportIndex };
