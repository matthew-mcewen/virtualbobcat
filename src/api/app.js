'use strict';

const express = require('express');
const meteringRoutes = require('./routes/metering');

function createApp() {
  const app = express();

  app.use('/api', meteringRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
