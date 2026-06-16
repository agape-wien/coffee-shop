ALTER TABLE "AdminConfig" ADD COLUMN "fsPrimaryMode"   TEXT NOT NULL DEFAULT 'px';
ALTER TABLE "AdminConfig" ADD COLUMN "fsSecondaryMode" TEXT NOT NULL DEFAULT 'px';
ALTER TABLE "AdminConfig" ADD COLUMN "fsSmallMode"     TEXT NOT NULL DEFAULT 'px';
