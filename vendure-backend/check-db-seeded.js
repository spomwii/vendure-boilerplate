// check-db-seeded.js
require('dotenv').config();
const { Client } = require('pg');

const dbConfig = {
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  host: process.env.DB_HOST,
};

console.log('dbConfig', dbConfig);

const client = new Client(dbConfig);
console.log('client', client);

client.connect();

client.query(`
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = '${process.env.DB_SCHEMA}'
    AND table_name = 'migration'
  );
`, (err, res) => {
  client.end();

  if (err) {
    console.error('Error checking if database has been seeded:', err);
    process.exit(1);
  }

  const dbSeeded = res.rows[0].exists;
  if (dbSeeded) {
    console.log('DB_SEEDED=true');
  } else {
    console.log('DB_SEEDED=false');
  }
});