'use strict';

const { haversineDistanceNm, projectPointOntoSegment } = require('../geo/greatCircle');

function sumPolylineDistance(polyline, fromIndex, toIndex) {
  let total = 0;
  for (let i = fromIndex; i < toIndex; i += 1) {
    total += haversineDistanceNm(polyline[i], polyline[i + 1]);
  }
  return total;
}

// Not airborne: distance runs from the departure airport, along the
// resolved route, to the metering point.
//
// Airborne: find the polyline segment the aircraft is currently progressing
// through (cross-track/along-track projection), take that segment's
// downstream vertex as the "closest ahead" reference point, and sum
// distance(aircraft -> reference) + distance(reference -> metering point
// along the route). Falls back to polyline[0] if the aircraft hasn't
// reached the first route vertex yet, or 0 if it's already at/past the
// metering point.
function computeRemainingDistanceNm({ polyline, meteringPointIndex, airborne, aircraftPos, adepCoords }) {
  if (meteringPointIndex < 0 || polyline.length === 0) {
    return null;
  }

  if (meteringPointIndex === 0) {
    const anchor = airborne ? aircraftPos : adepCoords || polyline[0];
    return haversineDistanceNm(anchor, polyline[0]);
  }

  if (!airborne) {
    const anchor = adepCoords || polyline[0];
    return haversineDistanceNm(anchor, polyline[0]) + sumPolylineDistance(polyline, 0, meteringPointIndex);
  }

  for (let i = 0; i < meteringPointIndex; i += 1) {
    const projection = projectPointOntoSegment(aircraftPos, polyline[i], polyline[i + 1]);
    if (projection.fractionAlong >= 0 && projection.fractionAlong <= 1) {
      const referenceVertex = polyline[i + 1];
      return (
        haversineDistanceNm(aircraftPos, referenceVertex) +
        sumPolylineDistance(polyline, i + 1, meteringPointIndex)
      );
    }
  }

  const firstSegment = projectPointOntoSegment(aircraftPos, polyline[0], polyline[1]);
  if (firstSegment.fractionAlong < 0) {
    return haversineDistanceNm(aircraftPos, polyline[0]) + sumPolylineDistance(polyline, 0, meteringPointIndex);
  }

  return 0;
}

module.exports = { computeRemainingDistanceNm, sumPolylineDistance };
