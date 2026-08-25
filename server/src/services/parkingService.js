const { randomUUID } = require('crypto');
const { pool, redis } = require('../config/db');
const { calculateFare } = require('./fareService');
const { logActivity } = require('./activityLogService');

const TYPES = new Set(['BIKE', 'CAR', 'TRUCK']);

function normalizeVehicleNumber(value) {
  return String(value || '').trim().toUpperCase();
}

function validateVehicleNumber(vehicleNumber) {
  if (!vehicleNumber || vehicleNumber.length > 30 || !/^[A-Z0-9 -]+$/.test(vehicleNumber)) throw Object.assign(new Error('Vehicle number must contain only letters, numbers, spaces, or hyphens and be 30 characters or fewer'), { status: 400, code: 'INVALID_VEHICLE_NUMBER' });
}

async function refreshSlotCache() {
  try {
    const { rows } = await pool.query(`SELECT vehicle_type, COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available, COUNT(*)::int AS total FROM parking_slots GROUP BY vehicle_type`);
    if (redis.isReady) for (const row of rows) await redis.set(`parking:slots:${row.vehicle_type}`, JSON.stringify({ total: row.total, available: row.available }), { EX: 30 });
  } catch (error) {
    console.error('Slot cache refresh failure:', error.message);
  }
}

async function invalidateSlotCache() {
  try { if (redis.isReady) await redis.del('parking:slots:BIKE', 'parking:slots:CAR', 'parking:slots:TRUCK'); } catch (error) { console.error('Slot cache invalidation failure:', error.message); }
}

async function parkVehicle(vehicleNumberInput, vehicleType) {
  const vehicleNumber = normalizeVehicleNumber(vehicleNumberInput);
  validateVehicleNumber(vehicleNumber);
  vehicleType = String(vehicleType || '').trim().toUpperCase();
  if (!TYPES.has(vehicleType)) throw Object.assign(new Error('Vehicle type must be BIKE, CAR, or TRUCK'), { status: 400, code: 'INVALID_VEHICLE_TYPE' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query("SELECT 1 FROM parking_records WHERE vehicle_number = $1 AND status = 'ACTIVE'", [vehicleNumber]);
    if (existing.rowCount) throw Object.assign(new Error('Vehicle is already parked'), { status: 409, code: 'DUPLICATE_ACTIVE_VEHICLE' });

    const slot = await client.query("SELECT id, slot_number FROM parking_slots WHERE vehicle_type = $1 AND status = 'AVAILABLE' ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1", [vehicleType]);
    if (!slot.rowCount) throw Object.assign(new Error('Parking Full'), { status: 409, code: 'PARKING_FULL' });

    const selectedSlot = slot.rows[0];
    await client.query("UPDATE parking_slots SET status = 'OCCUPIED', updated_at = NOW() WHERE id = $1", [selectedSlot.id]);
    const ticketId = `T-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const record = await client.query(`INSERT INTO parking_records (ticket_id, vehicle_number, vehicle_type, slot_id) VALUES ($1, $2, $3, $4) RETURNING ticket_id, vehicle_number, vehicle_type, slot_id, entry_time`, [ticketId, vehicleNumber, vehicleType, selectedSlot.id]);
    await client.query('COMMIT');
    await invalidateSlotCache();
    await refreshSlotCache();
    await logActivity('VEHICLE_PARKED', { vehicleNumber, ticketId, message: 'Vehicle parked successfully', metadata: { vehicleType, slotNumber: selectedSlot.slot_number } });
    return { ...record.rows[0], slot_number: selectedSlot.slot_number };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw Object.assign(new Error('Vehicle is already parked'), { status: 409, code: 'DUPLICATE_ACTIVE_VEHICLE' });
    if (error.code === 'PARKING_FULL') await logActivity('PARKING_FULL', { vehicleNumber, message: 'No available slot' });
    throw error;
  } finally { client.release(); }
}

async function exitVehicle({ ticketId, vehicleNumber: vehicleNumberInput }) {
  const vehicleNumber = normalizeVehicleNumber(vehicleNumberInput);
  if (!ticketId && !vehicleNumber) throw Object.assign(new Error('Provide ticketId or vehicleNumber'), { status: 400, code: 'INVALID_EXIT_REQUEST' });
  if (vehicleNumberInput) validateVehicleNumber(vehicleNumber);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const query = ticketId ? 'ticket_id = $1' : 'vehicle_number = $1';
    const value = String(ticketId || '').trim() || vehicleNumber;
    const result = await client.query(`SELECT r.*, s.slot_number FROM parking_records r JOIN parking_slots s ON s.id = r.slot_id WHERE ${query} AND r.status = 'ACTIVE' FOR UPDATE`, [value]);
    if (!result.rowCount) throw Object.assign(new Error('Vehicle is not currently parked'), { status: 404, code: 'VEHICLE_NOT_PARKED' });
    const record = result.rows[0];
    const exitTime = new Date();
    const durationMinutes = Math.max(0, Math.ceil((exitTime - new Date(record.entry_time)) / 60000));
    const fare = calculateFare(durationMinutes);
    await client.query("UPDATE parking_records SET exit_time = $1, duration_minutes = $2, fare = $3, status = 'COMPLETED', updated_at = NOW() WHERE id = $4", [exitTime, durationMinutes, fare, record.id]);
    await client.query("UPDATE parking_slots SET status = 'AVAILABLE', updated_at = NOW() WHERE id = $1", [record.slot_id]);
    await client.query('COMMIT');
    await invalidateSlotCache();
    await refreshSlotCache();
    await logActivity('VEHICLE_EXITED', { vehicleNumber: record.vehicle_number, ticketId: record.ticket_id, message: 'Vehicle exited successfully', metadata: { fare, durationMinutes, slotNumber: record.slot_number } });
    return { ticket_id: record.ticket_id, vehicle_number: record.vehicle_number, vehicle_type: record.vehicle_type, slot_number: record.slot_number, entry_time: record.entry_time, exit_time: exitTime, duration_minutes: durationMinutes, fare };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

async function getSlots() {
  if (redis.isReady) {
    const cached = await redis.mGet(['parking:slots:BIKE', 'parking:slots:CAR', 'parking:slots:TRUCK']);
    if (cached.every(Boolean)) return Object.fromEntries(cached.map((value, index) => [['bike', 'car', 'truck'][index], JSON.parse(value)]));
  }
  const { rows } = await pool.query(`SELECT vehicle_type, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available FROM parking_slots GROUP BY vehicle_type ORDER BY vehicle_type`);
  const result = Object.fromEntries(rows.map((row) => [row.vehicle_type.toLowerCase(), { total: row.total, available: row.available }]));
  await refreshSlotCache();
  return result;
}

async function getRecords(status, query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 25));
  const offset = (page - 1) * limit;
  const { rows } = await pool.query(`SELECT r.ticket_id, r.vehicle_number, r.vehicle_type, s.slot_number, r.entry_time, r.exit_time, r.duration_minutes, r.fare FROM parking_records r JOIN parking_slots s ON s.id = r.slot_id WHERE r.status = $1 ORDER BY r.entry_time DESC LIMIT $2 OFFSET $3`, [status, limit, offset]);
  return { records: rows, page, limit };
}

module.exports = { parkVehicle, exitVehicle, getSlots, getRecords };
