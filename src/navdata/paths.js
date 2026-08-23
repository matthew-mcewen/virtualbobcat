'use strict';

const path = require('path');
const config = require('../config');

function getFixPath() {
  return path.join(config.navdataDir, 'earth_fix.dat');
}

function getAirwayPath() {
  return path.join(config.navdataDir, 'earth_awy.dat');
}

function getAirportPath() {
  return path.join(config.navdataDir, 'earth_aptmeta.dat');
}

module.exports = { getFixPath, getAirwayPath, getAirportPath };
