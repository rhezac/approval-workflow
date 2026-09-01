import { Client } from 'pg';
import { decryptValue } from './common/crypto-helper';

export async function ensureDatabaseExists() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USERNAME || 'postgres';
  const rawPassword = process.env.DB_PASSWORD || 'password';
  const password = decryptValue(rawPassword);
  const dbName = process.env.DB_DATABASE || 'approval_workflow_db';

  const client = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres', // connect to default maintenance DB
  });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );

    if (result.rowCount === 0) {
      // Create database safely
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[Database] Database "${dbName}" did not exist and was automatically created.`);
    }
  } catch (err: any) {
    console.warn(`[Database] Auto-create check warning: ${err.message}`);
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
