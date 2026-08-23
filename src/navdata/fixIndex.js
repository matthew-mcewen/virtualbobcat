'use strict';

const { readDatLines } = require('./datFileReader');
const { getFixPath } = require('./paths');

const METERING_POINT_IDENTS = ['LAJAK', 'TAPIS', 'DOBAT', 'BIROS', 'ASLUM', 'SERKA'];

class FixIndex {
  constructor() {
    this.byIdentRegion = new Map();
    this.byIdent = new Map();
  }

  add(record) {
    const key = `${record.ident}|${record.region}`;
    if (!this.byIdentRegion.has(key)) this.byIdentRegion.set(key, []);
    this.byIdentRegion.get(key).push(record);

    if (!this.byIdent.has(record.ident)) this.byIdent.set(record.ident, []);
    this.byIdent.get(record.ident).push(record);
  }

  // ident+region is the reliable key -- plain ident is not unique across the
  // whole file (some idents repeat 100+ times in different regions).
  lookup(ident, region) {
    return this.byIdentRegion.get(`${ident}|${region}`) || [];
  }

  lookupByIdentAny(ident) {
    return this.byIdent.get(ident) || [];
  }

  getMeteringPointCoords() {
    const result = {};
    const missing = [];

    for (const ident of METERING_POINT_IDENTS) {
      const matches = this.lookupByIdentAny(ident);
      if (matches.length === 0) {
        missing.push(ident);
        continue;
      }
      const [first] = matches;
      result[ident] = { ident: first.ident, region: first.region, lat: first.lat, lon: first.lon };
    }

    if (missing.length > 0) {
      throw new Error(`Missing metering point fixes in earth_fix.dat: ${missing.join(', ')}`);
    }

    return result;
  }
}

async function loadFixIndex(filePath = getFixPath()) {
  const index = new FixIndex();
  let count = 0;

  for await (const tokens of readDatLines(filePath, { minTokens: 7 })) {
    const lat = Number(tokens[0]);
    const lon = Number(tokens[1]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;

    index.add({
      lat,
      lon,
      ident: tokens[2],
      areaCode: tokens[3],
      region: tokens[4],
      numericId: tokens[5],
      name: tokens[6],
    });
    count += 1;
  }

  return { index, count };
}

module.exports = { FixIndex, loadFixIndex, METERING_POINT_IDENTS };
