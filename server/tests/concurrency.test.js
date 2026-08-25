const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { pool, mongoClient, redis } = require('../src/config/db');

const integrationEnabled = process.env.RUN_INTEGRATION === '1';

test('only one simultaneous request claims the final car slot', { skip: !integrationEnabled }, async () => {
  const suffix = Date.now();
  const vehicleNumbers = [`RACE-A-${suffix}`, `RACE-B-${suffix}`];
  const testPrefix = `RACE-%`;
  try {
    const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'change-me-now' });
    assert.equal(login.status, 200);
    const authorization = { Authorization: `Bearer ${login.body.token}` };
    const available = await pool.query("SELECT COUNT(*)::int AS count FROM parking_slots WHERE vehicle_type = 'CAR' AND status = 'AVAILABLE'");
    assert.ok(available.rows[0].count >= 1, 'At least one car slot must be available');
    for (let index = 1; index < available.rows[0].count; index += 1) {
      const vehicleNumber = `RACE-${index}-${suffix}`;
      const response = await request(app).post('/api/parking/park').set(authorization).send({ vehicleNumber, vehicleType: 'CAR' });
      assert.equal(response.status, 201);
    }
    const responses = await Promise.all(vehicleNumbers.map((vehicleNumber) => request(app).post('/api/parking/park').set(authorization).send({ vehicleNumber, vehicleType: 'CAR' })));
    assert.equal(responses.filter((response) => response.status === 201).length, 1);
    assert.equal(responses.filter((response) => response.body.errorCode === 'PARKING_FULL').length, 1);
  } finally {
    const cleanup = await pool.query("SELECT slot_id FROM parking_records WHERE vehicle_number LIKE $1 AND status = 'ACTIVE'", [testPrefix]);
    await pool.query("DELETE FROM parking_records WHERE vehicle_number LIKE $1", [testPrefix]);
    if (cleanup.rows.length) await pool.query("UPDATE parking_slots SET status = 'AVAILABLE' WHERE id = ANY($1::int[])", [cleanup.rows.map((row) => row.slot_id)]);
    await pool.end();
    await mongoClient.close(true);
    if (redis.isOpen) await redis.disconnect();
  }
});
