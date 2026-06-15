-- Named time windows used as saved filter presets in the Orders tab.
CREATE TABLE "Event" (
    "id"       TEXT NOT NULL,
    "name"     TEXT NOT NULL,
    "fromTime" TIMESTAMP(3) NOT NULL,
    "toTime"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);
