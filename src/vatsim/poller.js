'use strict';

const config = require('../config');
const { fetchVatsimData } = require('./client');
const store = require('../tracking/store');

// Self-rescheduling singleton: fires immediately on start(), then always
// waits config.pollIntervalMs before the next fetch regardless of success or
// failure. Never triggered by incoming HTTP requests.
class VatsimPoller {
  constructor(tracker, navdata) {
    this.tracker = tracker;
    this.navdata = navdata;
    this.lastPollAt = null;
    this.lastError = null;
    this.timer = null;
  }

  start() {
    this.tick();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
  }

  async tick() {
    try {
      const data = await fetchVatsimData();
      const records = this.tracker.processCycle(data, this.navdata);
      store.setSnapshot(records);
      this.lastPollAt = Date.now();
      this.lastError = null;
      console.log(`[vatsim] poll ok -- ${records.length} in-scope flights`);
    } catch (err) {
      this.lastError = err.message;
      console.error(`[vatsim] poll failed: ${err.message}`);
    } finally {
      this.timer = setTimeout(() => this.tick(), config.pollIntervalMs);
    }
  }
}

module.exports = { VatsimPoller };
