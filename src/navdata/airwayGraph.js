'use strict';

const { readDatLines } = require('./datFileReader');
const { getAirwayPath } = require('./paths');

class AirwayGraph {
  constructor(name) {
    this.name = name;
    this.nodes = new Map();
    this.adjacency = new Map();
  }

  ensureNode(ident, region, fixIndex) {
    const key = `${ident}|${region}`;
    if (this.nodes.has(key)) return key;

    const [coords] = fixIndex.lookup(ident, region);
    this.nodes.set(key, {
      ident,
      region,
      lat: coords ? coords.lat : null,
      lon: coords ? coords.lon : null,
    });
    this.adjacency.set(key, []);
    return key;
  }

  addEdge(fromKey, toKey, direction, baseFl, topFl) {
    this.adjacency.get(fromKey).push({ to: toKey, direction, baseFl, topFl });
  }
}

class AirwayGraphStore {
  constructor() {
    this.graphs = new Map();
  }

  getAirway(name) {
    return this.graphs.get(name);
  }

  getOrCreate(name) {
    if (!this.graphs.has(name)) this.graphs.set(name, new AirwayGraph(name));
    return this.graphs.get(name);
  }
}

async function loadAirwayGraph(filePath = getAirwayPath(), fixIndex) {
  const store = new AirwayGraphStore();
  let count = 0;

  for await (const tokens of readDatLines(filePath, { minTokens: 11 })) {
    const [wpt1, region1, , wpt2, region2, , direction, , base, top, designatorField] = tokens;

    const baseFl = Number(base);
    const topFl = Number(top);
    // A segment can be shared by multiple airways, e.g. "AR19-Y291".
    const designators = designatorField.split('-');

    for (const name of designators) {
      const graph = store.getOrCreate(name);
      const key1 = graph.ensureNode(wpt1, region1, fixIndex);
      const key2 = graph.ensureNode(wpt2, region2, fixIndex);

      if (direction === 'F') {
        graph.addEdge(key1, key2, direction, baseFl, topFl);
      } else if (direction === 'B') {
        graph.addEdge(key2, key1, direction, baseFl, topFl);
      } else {
        // 'N' (bidirectional) and any unrecognized code default to both ways.
        graph.addEdge(key1, key2, direction, baseFl, topFl);
        graph.addEdge(key2, key1, direction, baseFl, topFl);
      }
    }
    count += 1;
  }

  return { store, count };
}

module.exports = { AirwayGraph, AirwayGraphStore, loadAirwayGraph };
