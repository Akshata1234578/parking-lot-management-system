const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { pool, mongoClient, redis } = require('../src/config/db');

const suffix = Date.now();
const testPlates = [];
let authorization;

function plate(label) {
  const value = `T${label}${suffix}`.slice(0, 30);
  testPlates.push(value);
  return value;
}

async function api(method, path, body) {
  return request(app)[method](path).set(authorization).send(body);
}

async function availableType() {
  const response = await api('get', '/api/parking/slots');
  return Object.entries(response.body.slots).find(([, value]) => value.available > 0)?.[0]?.toUpperCase();
}

test.before(async () => {
  const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'change-me-now' });
  assert.equal(login.status, 200);
  authorization = { Authorization: `Bearer ${login.body.token}` };
});

test.after(async () => {
  const result = await pool.query("SELECT slot_id FROM parking_records WHERE vehicle_number LIKE 'T%' AND vehicle_number LIKE $1 AND status = 'ACTIVE'", [`T%${suffix}`]);
  await pool.query("DELETE FROM parking_records WHERE vehicle_number LIKE $1", [`T%${suffix}`]);
  if (result.rows.length) await pool.query("UPDATE parking_slots SET status = 'AVAILABLE' WHERE id = ANY($1::int[])", [result.rows.map((row) => row.slot_id)]);
  await pool.end();
  await mongoClient.close(true);
  if (redis.isOpen) await redis.disconnect();
});

test('parks a valid vehicle and returns a ticket', async () => {
  const vehicleType = await availableType();
  assert.ok(vehicleType);
  const response = await api('post', '/api/parking/park', { vehicleNumber: plate('VALID'), vehicleType });
  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.ticket.vehicle_type, vehicleType);
  assert.ok(response.body.ticket.ticket_id);
});

test('rejects invalid vehicle number and vehicle type', async () => {
  const invalidNumber = await api('post', '/api/parking/park', { vehicleNumber: 'bad/plate', vehicleType: 'CAR' });
  assert.equal(invalidNumber.status, 400);
  assert.equal(invalidNumber.body.errorCode, 'INVALID_VEHICLE_NUMBER');
  const invalidType = await api('post', '/api/parking/park', { vehicleNumber: plate('TYPE'), vehicleType: 'BUS' });
  assert.equal(invalidType.status, 400);
  assert.equal(invalidType.body.errorCode, 'INVALID_VEHICLE_TYPE');
});

test('rejects a duplicate active vehicle', async () => {
  const vehicleType = await availableType();
  assert.ok(vehicleType);
  const vehicleNumber = plate('DUP');
  assert.equal((await api('post', '/api/parking/park', { vehicleNumber, vehicleType })).status, 201);
  const duplicate = await api('post', '/api/parking/park', { vehicleNumber, vehicleType });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.errorCode, 'DUPLICATE_ACTIVE_VEHICLE');
});

test('rejects parking when every slot of a type is full', async () => {
  const slots = await api('get', '/api/parking/slots');
  const candidate = Object.entries(slots.body.slots).find(([, value]) => value.available > 0);
  assert.ok(candidate);
  const [vehicleType, counts] = candidate;
  for (let index = 0; index < counts.available; index += 1) {
    const response = await api('post', '/api/parking/park', { vehicleNumber: plate(`FULL${index}`), vehicleType: vehicleType.toUpperCase() });
    assert.equal(response.status, 201);
  }
  const full = await api('post', '/api/parking/park', { vehicleNumber: plate('FULLX'), vehicleType: vehicleType.toUpperCase() });
  assert.equal(full.status, 409);
  assert.equal(full.body.message, 'Parking Full');
});

test('exits by ticket, releases the slot, and rejects a repeated exit', async () => {
  const vehicleType = await availableType();
  assert.ok(vehicleType);
  const vehicleNumber = plate('TICKET');
  const parked = await api('post', '/api/parking/park', { vehicleNumber, vehicleType });
  assert.equal(parked.status, 201);
  const before = await api('get', '/api/parking/slots');
  const exited = await api('post', '/api/parking/exit', { ticketId: parked.body.ticket.ticket_id });
  assert.equal(exited.status, 200);
  assert.equal(Number(exited.body.ticket.fare), 30);
  const after = await api('get', '/api/parking/slots');
  assert.equal(after.body.slots[vehicleType.toLowerCase()].available, before.body.slots[vehicleType.toLowerCase()].available + 1);
  const repeated = await api('post', '/api/parking/exit', { ticketId: parked.body.ticket.ticket_id });
  assert.equal(repeated.status, 404);
});

test('exits by vehicle number and rejects invalid exit identifiers', async () => {
  const vehicleType = await availableType();
  assert.ok(vehicleType);
  const vehicleNumber = plate('VEHICLE');
  const parked = await api('post', '/api/parking/park', { vehicleNumber, vehicleType });
  assert.equal(parked.status, 201);
  const exited = await api('post', '/api/parking/exit', { vehicleNumber });
  assert.equal(exited.status, 200);
  const invalidTicket = await api('post', '/api/parking/exit', { ticketId: 'T-does-not-exist' });
  assert.equal(invalidTicket.status, 404);
  const invalidVehicle = await api('post', '/api/parking/exit', { vehicleNumber: 'bad/plate' });
  assert.equal(invalidVehicle.status, 400);
  const emptyExit = await api('post', '/api/parking/exit', {});
  assert.equal(emptyExit.status, 400);
});
