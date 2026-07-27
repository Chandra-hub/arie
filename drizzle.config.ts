import type { Config } from 'drizzle-kit';

export default {
  schema: './src/storage/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://arie:arie@localhost:5432/arie',
  },
} satisfies Config;
