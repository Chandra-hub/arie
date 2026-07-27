import pino from 'pino';
import { StorageAdapters } from '../storage/repository.interface';
import { fetchJurisdictionContent, hashScrapedContents } from './scraper';
import { normalizeRegulations } from './normalizer';
import { classifyRegulation, findExistingRegulation } from './classifier';
import { detectChangedJurisdictions } from './change-detector';
import { RunOptions, AgentRunResult } from '../types/agent.types';

const logger = pino({ name: 'orchestrator' });

export async function runAgentForOrg(
  orgId: string,
  options: RunOptions,
  storage: StorageAdapters,
): Promise<AgentRunResult> {
  const trigger = options.trigger ?? 'manual';

  // 1. Load org config
  const org = await storage.orgs.getOrgById(orgId);
  if (!org) throw new Error(`Org not found: ${orgId}`);

  const jurisdictions = options.jurisdictions ?? org.jurisdictionFootprint;

  // 2. Create run record
  const run = await storage.agentRuns.createRun({ orgId, trigger, jurisdictions });
  await storage.agentRuns.updateRun(run.runId, { status: 'running' });

  logger.info({ orgId, runId: run.runId, jurisdictions, trigger }, 'Agent run started');

  let regulationsUpdated = 0;
  let changesDetected = 0;
  const processedJurisdictions: string[] = [];

  try {
    // 3. Determine which jurisdictions need processing
    const toProcess = options.force
      ? jurisdictions
      : await detectChangedJurisdictions(
          orgId,
          jurisdictions,
          storage.changeHashes,
        );

    logger.info({ orgId, toProcess }, 'Jurisdictions to process after change detection');

    // 4. Process each changed jurisdiction
    for (const code of toProcess) {
      try {
        logger.info({ orgId, code }, 'Processing jurisdiction');

        // Scrape raw content
        const scrapedContents = await fetchJurisdictionContent(code);
        if (scrapedContents.length === 0) {
          logger.warn({ orgId, code }, 'No content scraped — skipping');
          continue;
        }

        // Normalize via Claude
        const normalized = await normalizeRegulations(code, org.sectors, scrapedContents);
        if (normalized.length === 0) {
          logger.warn({ orgId, code }, 'No regulations extracted — skipping');
          continue;
        }

        // Load existing regulations for this jurisdiction (for change detection)
        const existing = await storage.regulations.getRegulationsByJurisdiction(orgId, code);

        // Classify, detect changes, and upsert each regulation
        for (const normalizedReg of normalized) {
          const existingReg = findExistingRegulation(normalizedReg, existing);
          const classified = classifyRegulation(code, normalizedReg, existingReg);

          if (classified.changeDetected) changesDetected++;

          await storage.regulations.upsertRegulation(orgId, classified);
          regulationsUpdated++;
        }

        // Store new content hash
        const freshHash = hashScrapedContents(scrapedContents);
        await storage.changeHashes.setHash(orgId, code, freshHash);

        processedJurisdictions.push(code);
        logger.info({ orgId, code, regulationsUpdated }, 'Jurisdiction processed');
      } catch (err) {
        logger.error({ orgId, code, err }, 'Error processing jurisdiction — continuing');
      }
    }

    // 5. Mark run complete
    await storage.agentRuns.updateRun(run.runId, {
      status: 'completed',
      regulationsUpdated,
      changesDetected,
      completedAt: new Date(),
    });

    // 6. Emit webhook if configured and there were changes
    if (org.webhookUrl && changesDetected > 0) {
      await emitWebhook(org.webhookUrl, {
        orgId,
        runId: run.runId,
        changesDetected,
        updatedJurisdictions: processedJurisdictions,
      });
    }

    logger.info(
      { orgId, runId: run.runId, regulationsUpdated, changesDetected },
      'Agent run completed',
    );

    return {
      runId: run.runId,
      regulationsUpdated,
      changesDetected,
      jurisdictionsProcessed: processedJurisdictions,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await storage.agentRuns.updateRun(run.runId, {
      status: 'failed',
      error: errorMessage,
      completedAt: new Date(),
    });
    logger.error({ orgId, runId: run.runId, err }, 'Agent run failed');
    throw err;
  }
}

async function emitWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const { default: axios } = await import('axios');
    await axios.post(webhookUrl, payload, {
      timeout: 10_000,
      headers: { 'Content-Type': 'application/json', 'X-ARIE-Event': 'regulation.changed' },
    });
  } catch (err) {
    pino({ name: 'orchestrator' }).error({ webhookUrl, err }, 'Webhook delivery failed');
  }
}
