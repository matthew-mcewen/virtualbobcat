'use strict';

const fs = require('fs');
const readline = require('readline');

// Navigraph .dat files start with an "I" line and a version/copyright line
// before any data. Blank lines (including the one that often follows the
// header) are skipped regardless of position.
const HEADER_LINES = 2;

async function* readDatLines(filePath, { minTokens = 1 } = {}) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  for await (const rawLine of rl) {
    lineNumber += 1;
    if (lineNumber <= HEADER_LINES) continue;

    const line = rawLine.trim();
    if (!line) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < minTokens) continue;

    yield tokens;
  }
}

module.exports = { readDatLines };
