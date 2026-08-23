'use strict';

const { resolveRoutePolyline } = require('./resolver');

// Per-callsign cache of resolved route polylines, invalidated whenever the
// flight plan's revision_id or raw route text changes -- avoids re-walking
// the airway graph every 180s poll for an unchanged route.
class RouteCache {
  constructor() {
    this.cache = new Map();
  }

  getOrResolve(callsign, flightPlan, navdata, meteringPointIdent) {
    const routeText = flightPlan.route || '';
    const revisionId = flightPlan.revision_id;
    const existing = this.cache.get(callsign);

    if (
      existing &&
      existing.revisionId === revisionId &&
      existing.routeText === routeText &&
      existing.meteringPoint === meteringPointIdent
    ) {
      return existing;
    }

    const { polyline, meteringPointIndex } = resolveRoutePolyline(
      { routeString: routeText, adep: flightPlan.departure, meteringPointIdent },
      navdata
    );

    const entry = { revisionId, routeText, meteringPoint: meteringPointIdent, polyline, meteringPointIndex };
    this.cache.set(callsign, entry);
    return entry;
  }

  delete(callsign) {
    this.cache.delete(callsign);
  }
}

module.exports = { RouteCache };
