require('dotenv').config();
const app = require('./app');
const { connectDependencies } = require('./config/db');

const port = process.env.PORT || 4000;
connectDependencies()
  .then(() => app.listen(port, () => console.log(`Parking API listening on http://localhost:${port}`)))
  .catch((error) => { console.error('Dependency connection failed:', error.message); process.exit(1); });
