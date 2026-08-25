const { activityLogs } = require('../config/db');

async function logActivity(eventType, details = {}) {
  try {
    await activityLogs().insertOne({ eventType, timestamp: new Date(), ...details });
  } catch (error) {
    console.error('Activity log failure:', error.message);
  }
}

module.exports = { logActivity };
