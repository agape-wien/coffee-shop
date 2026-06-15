-- Add font size columns to AdminConfig.
-- Defaults match the current hardcoded CSS values (2.25rem / 1.8rem / 1.5rem @ 16px base).
ALTER TABLE "AdminConfig" ADD COLUMN "fsPrimary" INTEGER NOT NULL DEFAULT 36;
ALTER TABLE "AdminConfig" ADD COLUMN "fsSecondary" INTEGER NOT NULL DEFAULT 29;
ALTER TABLE "AdminConfig" ADD COLUMN "fsSmall" INTEGER NOT NULL DEFAULT 24;
