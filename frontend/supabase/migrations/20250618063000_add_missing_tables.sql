-- Add missing tables to complete the MetX database schema
-- Migration: 20250618063000_add_missing_tables.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create models table
CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT DEFAULT 'openai',
    price_per_1k_tokens NUMERIC(10,6) NOT NULL
);

-- Create user_inputs table
CREATE TABLE IF NOT EXISTS user_inputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    text TEXT NOT NULL,
    input_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generation_results table
CREATE TABLE IF NOT EXISTS generation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_input_id UUID NOT NULL REFERENCES user_inputs(id),
    prompt_id UUID NOT NULL REFERENCES prompts(id),
    model_id TEXT NOT NULL REFERENCES models(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    raw_json JSONB,
    final_json JSONB,
    cost_chf NUMERIC(10,4),
    latency_ms INTEGER,
    output_image_url TEXT,
    manual_score INTEGER CHECK (manual_score >= 1 AND manual_score <= 5),
    manual_comment TEXT,
    auto_score NUMERIC(3,2),
    auto_rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_inputs_user_id ON user_inputs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inputs_created_at ON user_inputs(created_at);
CREATE INDEX IF NOT EXISTS idx_generation_results_user_input_id ON generation_results(user_input_id);
CREATE INDEX IF NOT EXISTS idx_generation_results_user_id ON generation_results(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_results_created_at ON generation_results(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS on all tables
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Models policies (public read)
CREATE POLICY "Public can view models" ON models
    FOR SELECT USING (true);

-- User inputs policies (users can only see their own)
CREATE POLICY "Users can view their own inputs" ON user_inputs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inputs" ON user_inputs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Generation results policies (users can only see their own)
CREATE POLICY "Users can view their own results" ON generation_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own results" ON generation_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own results" ON generation_results
    FOR UPDATE USING (auth.uid() = user_id);

-- Audit logs policies (users can only see their own)
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers
CREATE TRIGGER prompts_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON prompts
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER generation_results_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON generation_results
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Insert default models
INSERT INTO models (id, name, provider, price_per_1k_tokens) VALUES
    ('gpt-4o', 'GPT-4o', 'openai', 0.005),
    ('gpt-4o-mini', 'GPT-4o Mini', 'openai', 0.0015),
    ('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai', 0.001)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL ON models TO anon, authenticated, service_role;
GRANT ALL ON user_inputs TO anon, authenticated, service_role;
GRANT ALL ON generation_results TO anon, authenticated, service_role;
GRANT ALL ON audit_logs TO anon, authenticated, service_role; 