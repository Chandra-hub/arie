import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Tenant middleware runs after auth middleware.
 * By the time this runs, request.orgContext is already populated by auth.ts.
 * Use this middleware to add any additional per-org request enrichment.
 */
export async function tenantMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.orgContext) {
    return reply.status(401).send({ error: 'Unauthorized — no org context' });
  }

  // Add org-scoped request ID for tracing
  request.log.setBindings({
    orgId: request.orgContext.orgId,
  });
}
