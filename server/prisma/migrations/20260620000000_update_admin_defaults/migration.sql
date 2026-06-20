-- Change defaults for menu display flags and font sizes on AdminConfig.
-- Affects new installs only — existing rows retain their current values.
ALTER TABLE "AdminConfig" ALTER COLUMN "showDescription" SET DEFAULT false;
ALTER TABLE "AdminConfig" ALTER COLUMN "showComposition" SET DEFAULT false;
ALTER TABLE "AdminConfig" ALTER COLUMN "showImage" SET DEFAULT false;
ALTER TABLE "AdminConfig" ALTER COLUMN "fsPrimary" SET DEFAULT 24;
ALTER TABLE "AdminConfig" ALTER COLUMN "fsSecondary" SET DEFAULT 20;
ALTER TABLE "AdminConfig" ALTER COLUMN "fsSmall" SET DEFAULT 16;
ALTER TABLE "AdminConfig" ALTER COLUMN "pickupLanguage" SET DEFAULT 'de';
