import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const DEFAULT_DATABASE_URL = "file:./prisma/dev.db";

function resolveDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl || databaseUrl === "file:./dev.db") {
    return DEFAULT_DATABASE_URL;
  }

  return databaseUrl;
}

type PrismaClientOptions = Omit<ConstructorParameters<typeof PrismaClient>[0], "adapter">;

export function createPrismaClient(options?: PrismaClientOptions) {
  const adapter = new PrismaBetterSqlite3({
    url: resolveDatabaseUrl()
  });

  return new PrismaClient({
    ...options,
    adapter
  });
}
