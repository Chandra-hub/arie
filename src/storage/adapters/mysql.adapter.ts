/**
 * MySQL Storage Adapter
 *
 * TODO: Install the MySQL2 driver and implement all methods.
 *   npm install mysql2 drizzle-orm
 *
 * All four repository interfaces must be implemented.
 * The Drizzle ORM schema (src/storage/schema.ts) can be reused
 * with minor syntax changes for MySQL column types.
 *
 * See: https://orm.drizzle.team/docs/get-started-mysql
 */

import { StorageAdapters } from '../repository.interface';

export function createMySQLAdapters(_connectionString: string): StorageAdapters {
  throw new Error(
    'MySQL adapter not yet implemented. ' +
      'Install mysql2, adapt the Drizzle schema for MySQL, ' +
      'and implement all four repository interfaces following the pattern in postgres.adapter.ts',
  );
}
