import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from root if not already set
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString =
  process.env.DATABASE_URL || 'postgresql://dealflow:dealflow_secret@localhost:5433/dealflow360';

export const sqlClient = postgres(connectionString, { max: 10 });
export const db = drizzle(sqlClient, { schema });

export type Database = typeof db;
export { schema };
