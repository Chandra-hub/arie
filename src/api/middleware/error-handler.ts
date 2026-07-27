import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import pino from 'pino';

const logger = pino({ name: 'error-handler' });

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  logger.error({ err: error, url: request.url, method: request.method }, 'Request error');

  if (error.statusCode) {
    reply.status(error.statusCode).send({ error: error.message });
    return;
  }

  if (error.validation) {
    reply.status(400).send({ error: 'Validation error', details: error.validation });
    return;
  }

  reply.status(500).send({ error: 'Internal server error' });
}
