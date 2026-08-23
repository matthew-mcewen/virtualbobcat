'use strict';

const config = require('../config');
const { isInScopeDeparture, matchMeteringPoint } = require('../metering/scopeFilter');
const { RouteCache } = require('../route/routeCache');
const { createInitialState, updateAirborneTransition } = require('./flightState');
const { computeRemainingDistanceNm } = require('../metering/distance');
const {
  computeEtopFromSpeed,
  computeEtopFromEet,
  pickEetSeconds,
  blendEtop,
} = require('../metering/etop');
const { parseEetRemarks } = require('../eet/eetParser');
const { normalizeAltitudeToFeet } = require('../geo/units');
const { shouldExclude } = require('../metering/exclusion');

// Owns the per-flight state Map and runs one full pass per VATSIM poll:
// scope filter -> metering match -> airborne/ATOT update -> route resolve ->
// distance -> EET parse -> ETOP compute -> exclusion prune -> snapshot.
class FlightTracker {
  constructor() {
    this.flights = new Map();
    this.routeCache = new RouteCache();
  }

  processCycle(vatsimJson, navdata, now = Date.now()) {
    const pilots = (vatsimJson && vatsimJson.pilots) || [];
    const seenThisCycle = new Set();
    const records = [];

    for (const pilot of pilots) {
      const flightPlan = pilot.flight_plan;
      if (!flightPlan) continue;
      if (!isInScopeDeparture(flightPlan.departure)) continue;

      const meteringPoint = matchMeteringPoint(flightPlan.route);
      if (!meteringPoint) continue;

      seenThisCycle.add(pilot.callsign);

      let state = this.flights.get(pilot.callsign);
      if (!state) {
        state = createInitialState(pilot.callsign, pilot.cid, meteringPoint);
        this.flights.set(pilot.callsign, state);
      }
      state.meteringPoint = meteringPoint;
      state.lastSeenAt = now;
      state.missedCycles = 0;

      updateAirborneTransition(state, pilot.groundspeed, now, config.airborneKts);

      const { polyline, meteringPointIndex } = this.routeCache.getOrResolve(
        pilot.callsign,
        flightPlan,
        navdata,
        meteringPoint
      );

      const adepCoords = navdata.airportIndex.getAirport(flightPlan.departure);
      const aircraftPos = { lat: pilot.latitude, lon: pilot.longitude };

      const distanceRemainingNm = computeRemainingDistanceNm({
        polyline,
        meteringPointIndex,
        airborne: state.airborne,
        aircraftPos,
        adepCoords,
      });

      const plannedTasKt = Number(flightPlan.cruise_tas);
      const filedCruiseFt = normalizeAltitudeToFeet(flightPlan.altitude);

      const etopFromSpeed = computeEtopFromSpeed({
        airborne: state.airborne,
        groundspeedKt: pilot.groundspeed,
        plannedTasKt,
        altitudeFt: pilot.altitude,
        filedCruiseFt,
        remainingDistanceNm: distanceRemainingNm,
        now,
      });

      const eetMap = parseEetRemarks(flightPlan.remarks);
      const eetSeconds = pickEetSeconds(eetMap, meteringPoint);
      const etopFromEet = computeEtopFromEet({ atot: state.atot, eetSeconds });

      const etopBlended = blendEtop(etopFromSpeed, etopFromEet);
      if (etopBlended != null) {
        state.lastKnownEtop = etopBlended;
      }

      if (shouldExclude(state, now, pilot.longitude)) {
        this.flights.delete(pilot.callsign);
        this.routeCache.delete(pilot.callsign);
        continue;
      }

      records.push({
        callsign: state.callsign,
        cid: state.cid,
        adep: flightPlan.departure,
        altitude: pilot.altitude,
        meteringPoint,
        airborne: state.airborne,
        atot: state.atot,
        distanceRemainingNm,
        etopFromSpeed,
        etopFromEet,
        etopBlended,
      });
    }

    this.pruneStale(seenThisCycle);

    return records;
  }

  // Drops flights absent from the feed for too many consecutive cycles
  // (e.g. a logoff that never tripped the ETOP/longitude exclusion rules).
  pruneStale(seenThisCycle) {
    for (const [callsign, state] of this.flights.entries()) {
      if (seenThisCycle.has(callsign)) continue;

      state.missedCycles += 1;
      if (state.missedCycles > config.staleAfterCycles) {
        this.flights.delete(callsign);
        this.routeCache.delete(callsign);
      }
    }
  }
}

module.exports = { FlightTracker };
