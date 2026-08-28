-- Lightweight traffic/analytics table for the admin stats dashboard.
CREATE TABLE IF NOT EXISTS "visit_events" (
    "id"          TEXT NOT NULL,
    "path"        TEXT NOT NULL DEFAULT '/',
    "product_id"  TEXT,
    "ip"          TEXT NOT NULL DEFAULT '',
    "country"     TEXT NOT NULL DEFAULT 'XX',
    "city"        TEXT NOT NULL DEFAULT '',
    "referrer"    TEXT NOT NULL DEFAULT '',
    "user_agent"  TEXT NOT NULL DEFAULT '',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "visit_events_created_at_idx" ON "visit_events"("created_at");
CREATE INDEX IF NOT EXISTS "visit_events_country_idx" ON "visit_events"("country");
CREATE INDEX IF NOT EXISTS "visit_events_product_id_idx" ON "visit_events"("product_id");
