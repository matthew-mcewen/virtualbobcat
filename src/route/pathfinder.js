'use strict';

// BFS across one airway's own subgraph (built once at startup) from the
// entry fix to the exit fix, honoring direction restrictions already baked
// into the graph's edges. Returns the ordered list of node keys (inclusive
// of entry and exit), or null if unreachable.
function resolveAirwaySegment(airwayGraph, entryKey, exitKey) {
  if (!airwayGraph.nodes.has(entryKey) || !airwayGraph.nodes.has(exitKey)) {
    return null;
  }
  if (entryKey === exitKey) {
    return [entryKey];
  }

  const visited = new Set([entryKey]);
  const queue = [[entryKey]];

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    const edges = airwayGraph.adjacency.get(current) || [];

    for (const edge of edges) {
      if (edge.to === exitKey) {
        return [...path, exitKey];
      }
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push([...path, edge.to]);
      }
    }
  }

  return null;
}

module.exports = { resolveAirwaySegment };
