require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const { requireAuth } = require('./middleware/auth');
const { parkVehicle, exitVehicle, getSlots, getRecords } = require('./services/parkingService');
const { pool, mongoClient, redis } = require('./config/db');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '25kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', authRoutes);

const send = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
app.get('/api/health', async (_req, res) => {
  const checks = await Promise.allSettled([pool.query('SELECT 1'), mongoClient.db().command({ ping: 1 }), redis.isReady ? redis.ping() : Promise.reject(new Error('Redis is not connected'))]);
  const dependencies = { postgres: checks[0].status === 'fulfilled', mongodb: checks[1].status === 'fulfilled', redis: checks[2].status === 'fulfilled' };
  const healthy = Object.values(dependencies).every(Boolean);
  res.status(healthy ? 200 : 503).json({ success: healthy, message: healthy ? 'Parking API is healthy' : 'A dependency is unavailable', dependencies });
});
app.use('/api/parking', requireAuth);
app.post('/api/parking/park', async (req, res, next) => { try { const record = await parkVehicle(req.body?.vehicleNumber, req.body?.vehicleType); send(res, { ticket: record }, 201); } catch (error) { next(error); } });
app.post('/api/parking/exit', async (req, res, next) => { try { send(res, { ticket: await exitVehicle(req.body || {}) }); } catch (error) { next(error); } });
app.get('/api/parking/slots', async (req, res, next) => { try { send(res, { slots: await getSlots(req.query) }); } catch (error) { next(error); } });
app.get('/api/parking/active', async (req, res, next) => { try { send(res, await getRecords('ACTIVE', req.query)); } catch (error) { next(error); } });
app.get('/api/parking/history', async (req, res, next) => { try { send(res, await getRecords('COMPLETED', req.query)); } catch (error) { next(error); } });

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ success: false, message: status >= 500 ? 'Internal server error' : error.message, errorCode: error.code || 'INTERNAL_ERROR' });
});

module.exports = app;
