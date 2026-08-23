'use strict';

const { parseRouteString } = require('./tokenizer');
const { classifyTokens } = require('./classifier');
const { resolveAirwaySegment } = require('./pathfinder');

function nodeKey(v) {
  return `${v.ident}|${v.region}`;
}

// Expands a flight-planned route string into an ordered polyline of
// {ident, region, lat, lon} vertices, walking WAYPOINT/AIRWAY/WAYPOINT
// triples through the named airway's subgraph to resolve the real
// intermediate fixes (a route only names the two boundary fixes, not every
// hop). Expansion stops as soon as the metering point is reached.
function resolveRoutePolyline({ routeString, adep, meteringPointIdent }, navdata) {
  const adepCoords = navdata.airportIndex.getAirport(adep) || null;
  const tokens = parseRouteString(routeString);
  const classified = classifyTokens(tokens, navdata, adepCoords).filter(
    (item) => item.type !== 'UNKNOWN'
  );

  const polyline = [];
  let meteringPointIndex = -1;

  function appendVertex(vertex) {
    const last = polyline[polyline.length - 1];
    if (last && last.ident === vertex.ident && last.region === vertex.region) return;

    polyline.push(vertex);
    if (meteringPointIndex === -1 && vertex.ident === meteringPointIdent) {
      meteringPointIndex = polyline.length - 1;
    }
  }

  let i = 0;
  while (i < classified.length && meteringPointIndex === -1) {
    const item = classified[i];

    if (item.type === 'WAYPOINT') {
      appendVertex(item.resolved);
      i += 1;
      continue;
    }

    if (item.type === 'AIRWAY') {
      const entry = polyline[polyline.length - 1];
      const exitItem = classified[i + 1];

      if (!entry || !exitItem || exitItem.type !== 'WAYPOINT') {
        // Malformed sequence (airway with no resolvable entry/exit fix).
        i += 1;
        continue;
      }

      const airwayGraph = navdata.airwayStore.getAirway(item.raw);
      const path = airwayGraph
        ? resolveAirwaySegment(airwayGraph, nodeKey(entry), nodeKey(exitItem.resolved))
        : null;

      if (path) {
        for (const key of path.slice(1)) {
          const node = airwayGraph.nodes.get(key);
          appendVertex({ ident: node.ident, region: node.region, lat: node.lat, lon: node.lon });
        }
      } else {
        console.warn(
          `[route] could not resolve ${item.raw} between ${entry.ident} and ${exitItem.resolved.ident}; falling back to direct leg`
        );
        appendVertex(exitItem.resolved);
      }

      i += 2;
      continue;
    }

    i += 1;
  }

  return { polyline, meteringPointIndex };
}

module.exports = { resolveRoutePolyline, nodeKey };
