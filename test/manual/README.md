# Manual verification

No test framework is wired up yet (per MVP scope) -- this directory holds a
runnable script to sanity-check the route/distance/ETOP math without waiting
on live VATSIM traffic.

## Fixture

`test/fixtures/sampleVatsimWestbound.json` contains two pilots built against
a **verified real navdata chain** for the LAJAK metering point:

```
DOSHI --M875--> TAPIS --L509--> GIDOG --L509--> LAJAK
```

(All four fixes and both airway segments were confirmed present in
`earth_fix.dat` / `earth_awy.dat` before building the fixture.)

- `AIC101` (departure `VIDP`, in scope) starts on the ground at VIDP,
  groundspeed 0 -- exercises the not-airborne / ADEP-anchored distance
  branch, and the "filed TAS only" ETOP-from-speed branch.
- `CCA202` (departure `ZUUU`, in scope) starts airborne, positioned between
  `TAPIS` and `GIDOG`, at groundspeed 460kt (>5% off its filed 420kt TAS) and
  altitude 36000ft (at/above its filed 35000ft cruise) -- exercises the
  airborne cross-track/along-track projection branch and the
  "use groundspeed" ETOP-from-speed branch.

Both carry an `EET/LAJAK....` remark so `etopFromEet` becomes computable once
each has a captured ATOT.

## Running it

```bash
node test/manual/runFixture.js
```

The script runs three cycles through `FlightTracker.processCycle` directly:

1. The fixture as-is -- prints full detail DTOs for both flights so the
   distance/ETOP numbers can be hand-checked (e.g. against an online
   great-circle calculator) for both the not-airborne and airborne branches.
2. `AIC101`'s groundspeed flipped from 0 to 250kt -- demonstrates ATOT being
   captured exactly at the not_airborne -> airborne transition.
3. `CCA202` moved to longitude 55°E (west of the 57°E exclusion line) --
   demonstrates it dropping out of the next snapshot.

It also prints the final snapshot mapped through the same serializers the
`GET /api/metering` endpoint uses, so the JSON shape can be checked directly.

## API smoke test

Once the script's numbers look right, start the real server and confirm the
live endpoints:

```bash
npm start
curl http://localhost:3000/api/metering
curl http://localhost:3000/api/metering/LAJAK
curl http://localhost:3000/api/metering/BOGUS   # expect 400
```

`/api/metering` will be `[]` until the first VATSIM poll completes (fires
immediately on startup, ~15s+ for the request itself), and will only be
non-empty if real matching traffic happens to be flying at the time.
