-- ============================================
-- Prospector: Scraping support
-- ============================================

-- Scrape jobs history
CREATE TABLE prospector_scrape_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),

  job_type VARCHAR(50) NOT NULL, -- url_scrape, web_search, linkedin
  input_url TEXT,
  input_query TEXT,
  prospects_found INTEGER NOT NULL DEFAULT 0,
  prospects_imported INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'completed', -- completed, failed
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add source tracking columns to prospects
ALTER TABLE prospector_prospects
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS scrape_job_id UUID REFERENCES prospector_scrape_jobs(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_prospector_scrape_jobs_org ON prospector_scrape_jobs(organization_id);
CREATE INDEX idx_prospector_scrape_jobs_created ON prospector_scrape_jobs(created_at DESC);
CREATE INDEX idx_prospector_prospects_source ON prospector_prospects(source);

-- RLS
ALTER TABLE prospector_scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospector_scrape_jobs_select" ON prospector_scrape_jobs
  FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "prospector_scrape_jobs_insert" ON prospector_scrape_jobs
  FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "prospector_scrape_jobs_delete" ON prospector_scrape_jobs
  FOR DELETE USING (organization_id = get_user_org_id());
