-- A random seed per season keeps drawing-of-lots results stable across requests.
ALTER TABLE "Season" ADD COLUMN "standingsDrawSeed" UUID NOT NULL DEFAULT gen_random_uuid();
