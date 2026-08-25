const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const { createClient } = require('redis');

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://parking:parking@localhost:5432/parking_lot' });
const mongoClient = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017');
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.on('error', (error) => console.error('Redis error:', error.message));

async function connectDependencies() {
  await mongoClient.connect();
  await redis.connect();
}

const activityLogs = () => mongoClient.db(process.env.MONGO_DB).collection('activity_logs');

module.exports = { pool, mongoClient, redis, connectDependencies, activityLogs };
