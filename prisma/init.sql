PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT,
  "email" TEXT,
  "emailVerified" DATETIME,
  "image" TEXT,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" DATETIME NOT NULL,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");

CREATE TABLE IF NOT EXISTS "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

CREATE TABLE IF NOT EXISTS "AppSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "registrationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "allowManualSync" BOOLEAN NOT NULL DEFAULT true,
  "adminEmail" TEXT,
  "enabledProviderKeys" TEXT,
  "manualSyncStatus" TEXT NOT NULL DEFAULT 'IDLE',
  "manualSyncProgress" REAL NOT NULL DEFAULT 0,
  "manualSyncMessage" TEXT,
  "manualSyncSummary" TEXT,
  "manualSyncStartedAt" DATETIME,
  "manualSyncFinishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Station" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceKey" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'STATION',
  "countryCode" TEXT NOT NULL,
  "addressLine1" TEXT,
  "city" TEXT,
  "postcode" TEXT,
  "latitude" REAL NOT NULL,
  "longitude" REAL NOT NULL,
  "brand" TEXT,
  "operatorName" TEXT,
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "Station_sourceKey_externalId_key" ON "Station"("sourceKey", "externalId");
CREATE INDEX IF NOT EXISTS "Station_countryCode_city_idx" ON "Station"("countryCode", "city");

CREATE TABLE IF NOT EXISTS "FuelProduct" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "stationId" TEXT NOT NULL,
  "productCode" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "lastPrice" DECIMAL NOT NULL,
  "lastUpdatedAt" DATETIME NOT NULL,
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "FuelProduct_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FuelProduct_stationId_productCode_key" ON "FuelProduct"("stationId", "productCode");

CREATE TABLE IF NOT EXISTS "PriceSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fuelProductId" TEXT NOT NULL,
  "price" DECIMAL NOT NULL,
  "currency" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "observedAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceSnapshot_fuelProductId_fkey" FOREIGN KEY ("fuelProductId") REFERENCES "FuelProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PriceSnapshot_fuelProductId_observedAt_idx" ON "PriceSnapshot"("fuelProductId", "observedAt");

CREATE TABLE IF NOT EXISTS "Favourite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "stationId" TEXT NOT NULL,
  "nickname" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favourite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Favourite_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Favourite_userId_stationId_key" ON "Favourite"("userId", "stationId");

CREATE TABLE IF NOT EXISTS "AlertRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "favouriteId" TEXT NOT NULL,
  "fuelProductId" TEXT,
  "thresholdPrice" DECIMAL,
  "lowestLookbackDays" INTEGER,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lastTriggeredAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AlertRule_favouriteId_fkey" FOREIGN KEY ("favouriteId") REFERENCES "Favourite" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AlertRule_fuelProductId_fkey" FOREIGN KEY ("fuelProductId") REFERENCES "FuelProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
