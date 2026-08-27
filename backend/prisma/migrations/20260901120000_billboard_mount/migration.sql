-- Times Square inventory needs to record HOW a billboard is carried, so the
-- renderer can build a wall-mounted screen instead of a pylon.
ALTER TABLE "billboards" ADD COLUMN IF NOT EXISTS "mount" TEXT NOT NULL DEFAULT 'pole';
ALTER TABLE "billboards" ADD COLUMN IF NOT EXISTS "orientation" TEXT NOT NULL DEFAULT 'landscape';
