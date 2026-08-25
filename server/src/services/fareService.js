function calculateFare(durationMinutes) {
  if (durationMinutes <= 180) return 30;
  if (durationMinutes <= 360) return 85;
  return 120;
}

module.exports = { calculateFare };
