import { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { env } from '../../config/env';
import { StorageAdapters } from '../../storage/repository.interface';
import { OrgContext } from '../../types/org.types';

declare module 'fastify' {
  interface FastifyRequest {
    orgContext: OrgContext;
  }
}

export function buildAuthMiddleware(storage: StorageAdapters) {
  return async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      return reply.status(401).send({ error: 'Missing X-Api-Key header' });
    }

    const hash = createHash('sha256')
      .update(apiKey + env.API_KEY_SALT)
      .digest('hex');

    const org = await storage.orgs.getOrgByApiKeyHash(hash);

    if (!org) {
      return reply.status(401).send({ error: 'Invalid API key' });
    }

    request.orgContext = {
      orgId: org.orgId,
      jurisdictionFootprint: org.jurisdictionFootprint,
      sectors: org.sectors,
    };
  };
}

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext + env.API_KEY_SALT).digest('hex');
}

export function generateApiKey(): string {
  const { randomBytes } = require('crypto');
  return `arie_live_${randomBytes(24).toString('hex')}`;
}
