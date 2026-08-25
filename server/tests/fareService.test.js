const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateFare } = require('../src/services/fareService');

test('charges 30 rupees for up to three hours', () => assert.equal(calculateFare(180), 30));
test('charges 85 rupees for more than three and up to six hours', () => assert.equal(calculateFare(210), 85));
test('charges 120 rupees for more than six hours', () => assert.equal(calculateFare(361), 120));
