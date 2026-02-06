-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'seller',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prospects table
CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_title VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),
    website VARCHAR(500),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    estimated_value DECIMAL(12,2) DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    score_label VARCHAR(50) NOT NULL DEFAULT 'cold',
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    notes TEXT,
    assigned_to UUID REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prospects_score ON prospects(score DESC);
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_prospects_industry ON prospects(industry);
CREATE INDEX idx_prospects_country ON prospects(country);
CREATE INDEX idx_prospects_assigned_to ON prospects(assigned_to);
CREATE INDEX idx_prospects_company_name ON prospects(company_name);

-- Prospect tags junction
CREATE TABLE IF NOT EXISTS prospect_tags (
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (prospect_id, tag_id)
);

-- Pipeline stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6b7280',
    is_won BOOLEAN NOT NULL DEFAULT FALSE,
    is_lost BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default pipeline stages
INSERT INTO pipeline_stages (name, position, color, is_won, is_lost) VALUES
    ('Prospect', 1, '#6b7280', FALSE, FALSE),
    ('Contacted', 2, '#3b82f6', FALSE, FALSE),
    ('Interested', 3, '#f59e0b', FALSE, FALSE),
    ('Negotiation', 4, '#8b5cf6', FALSE, FALSE),
    ('Closed Won', 5, '#10b981', TRUE, FALSE),
    ('Closed Lost', 6, '#ef4444', FALSE, TRUE);

-- Pipeline entries (prospect in a stage)
CREATE TABLE IF NOT EXISTS pipeline_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
    entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exited_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX idx_pipeline_entries_prospect ON pipeline_entries(prospect_id);
CREATE INDEX idx_pipeline_entries_stage ON pipeline_entries(stage_id);

-- Pipeline history
CREATE TABLE IF NOT EXISTS pipeline_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    from_stage_id UUID REFERENCES pipeline_stages(id),
    to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
    moved_by UUID NOT NULL REFERENCES users(id),
    moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- Interactions
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    interaction_type VARCHAR(50) NOT NULL, -- email, call, meeting, note, linkedin_message
    subject VARCHAR(500),
    body TEXT,
    outcome VARCHAR(100),
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interactions_prospect ON interactions(prospect_id);
CREATE INDEX idx_interactions_created ON interactions(created_at DESC);

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    remind_at TIMESTAMPTZ NOT NULL,
    message TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reminders_due ON reminders(remind_at) WHERE NOT is_completed;
CREATE INDEX idx_reminders_user ON reminders(user_id);

-- AI Templates
CREATE TABLE IF NOT EXISTS ai_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- first_contact, follow_up, proposal, closing
    tone VARCHAR(50) NOT NULL DEFAULT 'formal', -- formal, casual, consultive
    subject_template TEXT,
    body_template TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scoring criteria configuration
CREATE TABLE IF NOT EXISTS scoring_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_value VARCHAR(255),
    points INTEGER NOT NULL DEFAULT 0,
    weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default scoring criteria
INSERT INTO scoring_criteria (name, field_name, field_value, points, weight) VALUES
    ('Large Company', 'company_size', '1000+', 20, 1.0),
    ('Mid Company', 'company_size', '100-999', 15, 1.0),
    ('Small Company', 'company_size', '10-99', 10, 1.0),
    ('Technology Industry', 'industry', 'Technology', 15, 1.0),
    ('Finance Industry', 'industry', 'Finance', 15, 1.0),
    ('Healthcare Industry', 'industry', 'Healthcare', 12, 1.0),
    ('C-Level Title', 'contact_title', 'C-Level', 20, 1.0),
    ('VP Title', 'contact_title', 'VP', 15, 1.0),
    ('Director Title', 'contact_title', 'Director', 12, 1.0),
    ('Manager Title', 'contact_title', 'Manager', 8, 1.0),
    ('Has Email', 'email', 'present', 5, 1.0),
    ('Has Phone', 'phone', 'present', 5, 1.0),
    ('Has LinkedIn', 'linkedin_url', 'present', 5, 1.0),
    ('Recent Interaction (7d)', 'last_interaction', '7_days', 15, 1.0),
    ('Stale (30d no contact)', 'last_interaction', '30_days_stale', -10, 1.0);
