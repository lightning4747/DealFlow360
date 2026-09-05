import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://dealflow:dealflow_secret@localhost:5432/dealflow360',
  },
  schemaFilter: ['sales', 'billing', 'fulfillment', 'analytics', 'portal'],
  verbose: true,
  strict: true,
});
