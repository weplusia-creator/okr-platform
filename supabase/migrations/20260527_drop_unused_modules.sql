-- Drop tables for retired modules: BMC, Prospector, ROI.
--
-- Run this in the Supabase SQL editor (Database → SQL) after deploying
-- the matching frontend changes. CASCADE removes any dependent RLS
-- policies, foreign keys and indexes. IF EXISTS keeps the script safe
-- to re-run and tolerant of variants between environments.

-- ────────────────────────────────────────────────────────
-- BMC (Business Model Canvas)
-- ────────────────────────────────────────────────────────
DROP TABLE IF EXISTS bmc_votes            CASCADE;
DROP TABLE IF EXISTS bmc_responses        CASCADE;
DROP TABLE IF EXISTS bmc_blocks           CASCADE;
DROP TABLE IF EXISTS bmc_questions        CASCADE;
DROP TABLE IF EXISTS bmc_participants     CASCADE;
DROP TABLE IF EXISTS bmc_canvases         CASCADE;
DROP TABLE IF EXISTS bmc_templates        CASCADE;

-- ────────────────────────────────────────────────────────
-- B2B Prospector
-- ────────────────────────────────────────────────────────
DROP TABLE IF EXISTS prospector_interactions     CASCADE;
DROP TABLE IF EXISTS prospector_scrape_jobs      CASCADE;
DROP TABLE IF EXISTS prospector_prospects        CASCADE;
DROP TABLE IF EXISTS prospector_lists            CASCADE;
DROP TABLE IF EXISTS prospector_scoring_criteria CASCADE;
DROP TABLE IF EXISTS prospector_templates        CASCADE;

-- ────────────────────────────────────────────────────────
-- ROI Calculator
-- ────────────────────────────────────────────────────────
DROP TABLE IF EXISTS roi_analyses  CASCADE;
DROP TABLE IF EXISTS roi_templates CASCADE;
