'use strict';

const express = require('express');
const store = require('../../tracking/store');
const { METERING_POINT_IDENTS } = require('../../metering/meteringPoints');
const { toSummaryDto, toDetailDto } = require('../serializers');

const router = express.Router();

router.get('/metering', (req, res) => {
  const records = store.getSnapshot();
  res.json(records.map(toSummaryDto));
});

router.get('/metering/:point', (req, res) => {
  const point = req.params.point.toUpperCase();
  if (!METERING_POINT_IDENTS.includes(point)) {
    return res.status(400).json({ error: `Unknown metering point: ${point}` });
  }

  const records = store.getSnapshot().filter((r) => r.meteringPoint === point);
  res.json(records.map(toDetailDto));
});

module.exports = router;
