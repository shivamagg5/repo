// citext custom column type for Drizzle ORM
// PostgreSQL citext is a case-insensitive text type.
// Drizzle doesn't have built-in citext support, so we use this custom type.
import { customType } from 'drizzle-orm/pg-core';

export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});
