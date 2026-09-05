import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://dealflow:dealflow_secret@localhost:5433/dealflow360',
  },
  schemaFilter: ['sales', 'billing', 'fulfillment', 'analytics', 'portal'],
  verbose: true,
  strict: true,
});
