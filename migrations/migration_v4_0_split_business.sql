-- Migration: split the Business Board out into Cassimir Management Center
-- Version: v4.0.0
--
-- ORDER MATTERS. Run part 1 whenever. Run part 2 only once the five real rows
-- are verified inside CMC and ~/backups/business-<date>.sql exists — it is the
-- point of no return for this repository.

-- ---------------------------------------------------------------------------
-- Part 1 — the bridge
--
-- A transformed job now points at an opportunity in another application, so it
-- needs somewhere to keep the link. Without it the locked card can say "this
-- was transformed" but not "here is where it went".
-- ---------------------------------------------------------------------------

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_opportunity_url TEXT;

-- ---------------------------------------------------------------------------
-- Part 2 — the amputation
--
-- Preconditions, all three:
--   1. ~/backups/business-<date>.sql holds a pg_dump of both tables.
--   2. The five rows owned by user_id = 1 are visible and correct at
--      http://localhost:8080, and the Lexgra Lawyers PDF downloads.
--   3. No code in this repository references business_entities any more:
--        grep -ri business src server --include="*.ts*"
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS business_entity_files;
DROP TABLE IF EXISTS business_entities;
