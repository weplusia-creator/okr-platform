ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT gen_random_uuid();
