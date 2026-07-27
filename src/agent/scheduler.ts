import cron from 'node-cron';
import pino from 'pino';
import { env } from '../config/env';
import { StorageAdapters } from '../storage/repository.interface';
import { runAgentForOrg } from './orchestrator';

const logger = pino({ name: 'scheduler' });

export function startScheduler(storage: StorageAdapters): void {
  // ── Weekly baseline fetch ─────────────────────────────────────────────────
  // Default: every Sunday at 02:00 UTC
  cron.schedule(env.WEEKLY_CRON_SCHEDULE, async () => {
    logger.info('Weekly scheduled run triggered');
    await runForAllOrgs(storage, 'scheduled', { force: false });
  });

  // ── Change detection polling ──────────────────────────────────────────────
  // Default: every 6 hours
  const changeDetectionSchedule = `0 */${env.CHANGE_DETECTION_INTERVAL_HOURS} * * *`;
  cron.schedule(changeDetectionSchedule, async () => {
    logger.info('Change detection poll triggered');
    await runForAllOrgs(storage, 'event', { force: false });
  });

  logger.info(
    {
      weeklySchedule: env.WEEKLY_CRON_SCHEDULE,
      changeDetectionIntervalHours: env.CHANGE_DETECTION_INTERVAL_HOURS,
    },
    'Scheduler started',
  );
}

async function runForAllOrgs(
  storage: StorageAdapters,
  trigger: 'scheduled' | 'event',
  options: { force: boolean },
): Promise<void> {
  const orgs = await storage.orgs.getAllOrgs();
  logger.info({ orgCount: orgs.length, trigger }, 'Running agent for all orgs');

  for (const org of orgs) {
    try {
      await runAgentForOrg(org.orgId, { trigger, force: options.force }, storage);
    } catch (err) {
      logger.error({ orgId: org.orgId, err }, 'Scheduled run failed for org — continuing');
    }
  }
}
