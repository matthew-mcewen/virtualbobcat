'use strict';

const config = require('./config');
const { loadNavdata } = require('./navdata/loader');
const { FlightTracker } = require('./tracking/tracker');
const { VatsimPoller } = require('./vatsim/poller');
const { createApp } = require('./api/app');

async function main() {
  const navdata = await loadNavdata();

  const tracker = new FlightTracker();
  const poller = new VatsimPoller(tracker, navdata);
  poller.start();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[http] listening on port ${config.port}`);
  });

  const shutdown = () => {
    console.log('[index] shutting down');
    poller.stop();
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[index] fatal startup error:', err);
  process.exit(1);
});
