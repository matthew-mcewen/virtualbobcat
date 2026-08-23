# virtualbobcat

A VATSIM-based simulation of the real-world **BOBCAT** ATC metering system for OAKB (Kabul FIR) westbound overflight traffic.

## Overview

BOBCAT analyzes flight-planned routes of westbound aircraft transiting Afghan airspace, computes an estimated time of passing (ETOP) for each aircraft at one of five named metering points, and is the foundation for future assigned time of passing (ATOP) and level-based separation assignments.

The system:
1. **Polls the VATSIM datafeed** (at most once every 180 seconds, respecting rate limits)
2. **Identifies in-scope flights**: westbound departures (ADEP first letter ∈ [R,V,W,Z,Y,N,A]) routing via one of six named airways (M875, L509, N644, L750, P628, UL333)
3. **Assigns a metering point**: LAJAK (M875+L509), DOBAT (N644), BIROS (L750), ASLUM (P628), SERKA (UL333)
4. **Computes ETOP**: via great-circle distance (haversine + segment projection) and current/planned speed, optionally refined by EET remarks
5. **Tracks state**: actual takeoff time (ATOT), airborne transitions, and flight exclusion after 1h past ETOP or when crossing west of 57°E

## Quick start

### Installation

```bash
npm install
```

### Running the server

```bash
npm start
```

The server will:
- Load navdata from `earth_fix.dat`, `earth_awy.dat`, `earth_aptmeta.dat` (at repo root)
- Verify all metering points and target airways are resolvable
- Start an in-process VATSIM poller (fires immediately, then every 180s)
- Listen on port 3000 (configurable via `PORT` env var)

Typical startup output:
```
[navdata] loaded 250762 fixes, 111049 airway segments, 15608 airports in 1352ms
[navdata] verified metering points: LAJAK, TAPIS, DOBAT, BIROS, ASLUM, SERKA
[navdata] verified airways: M875, L509, N644, L750, P628, UL333
[http] listening on port 3000
[vatsim] poll ok -- 7 in-scope flights
```

### Configuration

Create a `.env` file (copy from `.env.example`):

```bash
PORT=3000
NAVDATA_DIR=.
VATSIM_POLL_MS=180000
EXCLUSION_GRACE_MS=3600000
```

All environment variables have sensible defaults (see `src/config.js`).

## API

### `GET /api/metering`

Returns all in-scope, non-excluded flights across all metering points.

**Response** (array of summaries):
```json
[
  {
    "adep": "VIDP",
    "acid": "AIC101",
    "fl": 350,
    "meteringPoint": "LAJAK",
    "etop": "2026-08-23T06:59:19.123Z"
  }
]
```

**Fields**:
- `adep`: 4-letter ICAO departure airport code
- `acid`: aircraft callsign
- `fl`: flight level (altitude rounded to nearest 1000ft ÷ 100; e.g., 35000ft → 350)
- `meteringPoint`: one of LAJAK, DOBAT, BIROS, ASLUM, SERKA
- `etop`: ISO 8601 timestamp of estimated time of passing (blended from speed + EET)

### `GET /api/metering/:point`

Returns all aircraft assigned to a specific metering point, with diagnostic fields.

**Parameters**:
- `:point` — one of `LAJAK`, `DOBAT`, `BIROS`, `ASLUM`, `SERKA` (case-insensitive)

**Response** (array of details):
```json
[
  {
    "adep": "VIDP",
    "acid": "AIC101",
    "fl": 350,
    "meteringPoint": "LAJAK",
    "etop": "2026-08-23T06:59:19.123Z",
    "airborne": true,
    "atot": "2026-08-23T06:04:39.888Z",
    "distanceRemainingNm": 135.15,
    "etopFromSpeed": "2026-08-23T06:23:58.359Z",
    "etopFromEet": "2026-08-23T07:34:39.888Z",
    "etopBlended": "2026-08-23T06:59:19.123Z"
  }
]
```

**Additional fields** (diagnostics):
- `airborne`: boolean (groundspeed ≥ 150kt)
- `atot`: actual takeoff time (captured on not-airborne → airborne transition; `null` if still on ground)
- `distanceRemainingNm`: nautical miles from current position (or ADEP if not airborne) to metering point
- `etopFromSpeed`: ETOP computed from current/planned speed
- `etopFromEet`: ETOP parsed from flight plan remarks (EET/ block) plus ATOT
- `etopBlended`: arithmetic average of both, or whichever is available

**Error responses**:
- `400 {"error": "Unknown metering point: ..."}` — `:point` not in the list of 5 known idents

## Verification

### Manual fixture test

A pre-built VATSIM-shaped fixture with two test flights (one not-yet-airborne, one airborne) is available for sanity-checking the route resolution and distance/ETOP math without live traffic:

```bash
node test/manual/runFixture.js
```

The fixture is built on a **verified real navdata chain** (`DOSHI→M875→TAPIS→L509→GIDOG→L509→LAJAK`) and exercises:
- Not-airborne ADEP-anchored distance calculation
- Airborne cross-track/along-track projection to find the "nearest ahead" vertex
- ATOT captured exactly on the transition to airborne
- Both ETOP computation branches (speed vs. EET) and their blend
- Exclusion when longitude crosses 57°E

See [test/manual/README.md](test/manual/README.md) for detailed usage.

### Live server smoke test

Start the server, then:

```bash
# All in-scope flights
curl http://localhost:3000/api/metering

# Specific metering point (with diagnostics)
curl http://localhost:3000/api/metering/LAJAK
curl http://localhost:3000/api/metering/DOBAT

# Invalid metering point (expect 400)
curl http://localhost:3000/api/metering/BOGUS
```

**Note**: `/api/metering` returns `[]` until the first VATSIM poll completes (~10–15s after startup). To see populated data, either wait for live traffic or run the fixture test.

## Architecture

### Module structure

```
src/
├── config.js                    Environment configuration
├── index.js                     Entrypoint: load navdata, start poller, start HTTP server
├── navdata/
│   ├── paths.js                Resolve navdata file paths
│   ├── datFileReader.js        Stream .dat files, skip headers, yield token arrays
│   ├── fixIndex.js             Parse earth_fix.dat → Map<"IDENT|REGION", FixRecord[]>
│   ├── airwayGraph.js          Parse earth_awy.dat → Map<airwayName, Graph{nodes, adjacency}>
│   ├── airportIndex.js         Parse earth_aptmeta.dat → Map<ident, {lat, lon}>
│   └── loader.js               Orchestrate loading all three, verify metering points/airways
├── geo/
│   ├── greatCircle.js          Haversine distance, bearing, cross-track/along-track projection
│   └── units.js                Altitude normalization (FL350 → feet)
├── route/
│   ├── tokenizer.js            Parse route string, strip speed/level annotations, drop DCT
│   ├── classifier.js           Label tokens as WAYPOINT/AIRWAY/UNKNOWN via navdata membership
│   ├── pathfinder.js           BFS across airway's subgraph to expand intermediate fixes
│   ├── resolver.js             Orchestrate tokenizer→classifier→pathfinder → full polyline
│   └── routeCache.js           Cache resolved routes per callsign, invalidate on revision change
├── eet/
│   └── eetParser.js            Parse EET/ block from remarks → {ident → durationSeconds}
├── metering/
│   ├── meteringPoints.js       Config: 5 metering points, required airways, regex builders
│   ├── scopeFilter.js          Scope filter (ADEP first-letter, airway regex match)
│   ├── distance.js             Compute remaining distance (not-airborne vs. airborne branches)
│   ├── etop.js                 Compute ETOP from speed or EET, blend the two
│   └── exclusion.js            Exclusion logic (time-based or longitude-based)
├── tracking/
│   ├── flightState.js          Pure helpers for state creation/update
│   ├── tracker.js              FlightTracker class: processCycle() runs full pipeline
│   └── store.js                In-memory snapshot store (read by HTTP handlers)
├── vatsim/
│   ├── client.js               Fetch VATSIM datafeed via native fetch()
│   └── poller.js               Self-rescheduling singleton polling loop
└── api/
    ├── app.js                  Express app creation
    ├── routes/metering.js      GET /api/metering and GET /api/metering/:point
    └── serializers.js          DTO mappers (summary vs. detail, FL rounding)
```

### Key algorithms

**Great-circle distance**: spherical haversine on Earth radius 3440.065 nm.

**Airborne distance computation**:
- Project aircraft onto each polyline segment (cross-track/along-track math)
- Find the segment where projection falls within `[0, 1]` fraction
- Distance = haversine(aircraft → segment's downstream vertex) + sum of segments from there to metering point

**Not-airborne distance**: treat departure airport as a virtual first vertex; sum haversine across the full chain to metering point.

**Route resolution**: parse route tokens, classify each as WAYPOINT or AIRWAY via navdata, then for each WAYPOINT/AIRWAY/WAYPOINT triple, BFS the airway's subgraph to expand the intermediate fixes (a route only names boundary fixes, not every hop).

**ETOP computation**:
- **From speed**: use groundspeed only if airborne AND groundspeed deviates >5% from filed TAS AND altitude ≥ filed cruise level; otherwise use filed TAS
- **From EET**: parse EET remarks (e.g., `EET/LAJAK0130`), convert HHMM to seconds, add to ATOT
- **Blended**: arithmetic average of both when available, or whichever is available

**Exclusion**: drop a flight once `now > lastKnownEtop + 1 hour` OR `longitude < 57°E`, whichever comes first.

### Data structures

**FixRecord**: `{ident, region, areaCode, lat, lon, numericId, name}`

**AirwayGraph** (per airway name): 
```
{
  nodes: Map<"IDENT|REGION", {ident, region, lat, lon}>,
  adjacency: Map<"IDENT|REGION", Array<{to, direction, baseFl, topFl}>>
}
```

**FlightState** (tracked per callsign):
```
{
  callsign, cid, meteringPoint,
  airborne, atot, lastSeenAt, lastKnownEtop,
  routeCache: {revisionId, routeText, polyline, meteringPointIndex}
}
```

## Known limitations

### Route resolution fallbacks

If a flight's filed route references an airway segment that isn't in the current navdata (e.g., a segment has been decommissioned), the resolver logs a warning and falls back to a direct leg between the two boundary fixes. In rare cases, this can result in `distanceRemainingNm` and `etopFromSpeed` being `null` if the metering point itself isn't part of the expanded polyline. `etopFromEet` will still populate independently if the remarks carry an EET.

### VATSIM rate limiting

The poller respects the documented 180-second rate limit and is a hard floor — if your application needs more frequent updates (e.g., for real-time separation assurance), you would need to switch from polling to a pub/sub model (e.g., WebSocket feed if VATSIM offered one) or cache more aggressively at a proxy layer.

### In-memory only

All flight state is lost on process restart. For production use, consider adding a persistent store (e.g., Redis for ATOT/ETOP history, PostgreSQL for audit trail).

## Development

### Dependencies

- **express** (HTTP framework)
- No additional runtime dependencies — the app uses Node 18+ native `fetch` for the VATSIM client

### Running in dev mode (with auto-reload)

```bash
npm run dev
```

Uses `node --watch` (requires Node 18.11+).

## License

(Add your license here, e.g., MIT)

## Contact

Questions or feedback? See the GitHub repository issues.
