'use strict';

const { loadFixIndex } = require('./fixIndex');
const { loadAirwayGraph } = require('./airwayGraph');
const { loadAirportIndex } = require('./airportIndex');

const REQUIRED_AIRWAYS = ['M875', 'L509', 'N644', 'L750', 'P628', 'UL333'];

async function loadNavdata() {
  const start = Date.now();

  const { index: fixIndex, count: fixCount } = await loadFixIndex();
  const { store: airwayStore, count: airwayCount } = await loadAirwayGraph(undefined, fixIndex);
  const { index: airportIndex, count: airportCount } = await loadAirportIndex();

  // Fail fast: better to abort startup than silently serve broken ETOPs.
  const meteringPointCoords = fixIndex.getMeteringPointCoords();

  const missingAirways = REQUIRED_AIRWAYS.filter((name) => !airwayStore.getAirway(name));
  if (missingAirways.length > 0) {
    throw new Error(`Missing required airways in earth_awy.dat: ${missingAirways.join(', ')}`);
  }

  const elapsedMs = Date.now() - start;
  console.log(
    `[navdata] loaded ${fixCount} fixes, ${airwayCount} airway segments, ${airportCount} airports in ${elapsedMs}ms`
  );
  console.log(`[navdata] verified metering points: ${Object.keys(meteringPointCoords).join(', ')}`);
  console.log(`[navdata] verified airways: ${REQUIRED_AIRWAYS.join(', ')}`);

  return { fixIndex, airwayStore, airportIndex, meteringPointCoords };
}

module.exports = { loadNavdata, REQUIRED_AIRWAYS };
