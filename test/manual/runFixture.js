'use strict';

// Manual, no-framework verification script. Feeds the sample fixture through
// FlightTracker.processCycle directly (no live VATSIM traffic needed) and
// prints the resulting distance/ETOP numbers so they can be hand-checked
// against an independently computed great-circle distance.
//
// Run with: node test/manual/runFixture.js

const fs = require('fs');
const path = require('path');

const { loadNavdata } = require('../../src/navdata/loader');
const { FlightTracker } = require('../../src/tracking/tracker');
const { toSummaryDto, toDetailDto } = require('../../src/api/serializers');

const fixturePath = path.join(__dirname, '..', 'fixtures', 'sampleVatsimWestbound.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function main() {
  const navdata = await loadNavdata();
  const tracker = new FlightTracker();

  console.log('\n=== Cycle 1: fixture as-is (AIC101 not airborne, CCA202 airborne) ===');
  const fixture1 = loadFixture();
  const records1 = tracker.processCycle(fixture1, navdata);
  for (const record of records1) {
    console.log(record.callsign, JSON.stringify(toDetailDto(record), null, 2));
  }

  console.log('\n=== Cycle 2: AIC101 transitions to airborne (groundspeed 0 -> 250) ===');
  const fixture2 = clone(fixture1);
  const aic101 = fixture2.pilots.find((p) => p.callsign === 'AIC101');
  aic101.groundspeed = 250;
  // Nudge it just past DOSHI, still well inside the M875/L509 chain.
  aic101.latitude = 35.4;
  aic101.longitude = 68.6;

  const records2 = tracker.processCycle(fixture2, navdata, Date.now() + 10 * 60 * 1000);
  const aic101Record = records2.find((r) => r.callsign === 'AIC101');
  console.log('AIC101 ATOT captured at transition:', aic101Record.atot, new Date(aic101Record.atot).toISOString());
  console.log(JSON.stringify(toDetailDto(aic101Record), null, 2));

  console.log('\n=== Cycle 3: exclusion check (CCA202 flown west of 57E) ===');
  const fixture3 = clone(fixture2);
  const cca202 = fixture3.pilots.find((p) => p.callsign === 'CCA202');
  cca202.longitude = 55.0;
  const records3 = tracker.processCycle(fixture3, navdata, Date.now() + 20 * 60 * 1000);
  const stillTracked = records3.some((r) => r.callsign === 'CCA202');
  console.log('CCA202 still present after crossing 57E?', stillTracked, '(expected: false)');

  console.log('\n=== Summary DTOs (GET /api/metering shape) ===');
  console.log(JSON.stringify(records3.map(toSummaryDto), null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
