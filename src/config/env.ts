import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),

  // Storage
  STORAGE_ADAPTER: z.enum(['postgres', 'mysql', 'cosmos', 'dynamo']).default('postgres'),
  DATABASE_URL: z.string().optional(),

  // Cosmos DB
  COSMOS_ENDPOINT: z.string().optional(),
  COSMOS_KEY: z.string().optional(),
  COSMOS_DATABASE: z.string().optional(),

  // DynamoDB
  AWS_REGION: z.string().optional(),
  DYNAMO_TABLE_PREFIX: z.string().default('arie_'),

  // Agent
  WEEKLY_CRON_SCHEDULE: z.string().default('0 2 * * 0'),
  CHANGE_DETECTION_INTERVAL_HOURS: z.coerce.number().default(6),

  // Security
  API_KEY_SALT: z.string().min(16, 'API_KEY_SALT must be at least 16 characters'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
