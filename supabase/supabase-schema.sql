-- MetX Prompting Tool - Supabase Database Schema
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create prompts table
CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    template_text TEXT NOT NULL,
    json_prefix TEXT,
    json_suffix TEXT,
    use_placeholder BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create models table (for AI model configurations)
CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT DEFAULT 'openai',
    price_per_1k_tokens DECIMAL(10,6) NOT NULL
);

-- Create user_inputs table
CREATE TABLE IF NOT EXISTS user_inputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    text TEXT NOT NULL,
    input_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generation_results table
CREATE TABLE IF NOT EXISTS generation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_input_id UUID REFERENCES user_inputs(id) NOT NULL,
    prompt_id UUID REFERENCES prompts(id) NOT NULL,
    model_id TEXT REFERENCES models(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    raw_json JSONB,
    final_json JSONB,
    cost_chf DECIMAL(10,4),
    latency_ms INTEGER,
    output_image_url TEXT,
    manual_score INTEGER CHECK (manual_score >= 1 AND manual_score <= 5),
    manual_comment TEXT,
    auto_score DECIMAL(3,2),
    auto_rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table for tracking changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('input_images', 'input_images', false),
    ('output_images', 'output_images', false)
ON CONFLICT (id) DO NOTHING;

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Prompts: Users can read all prompts, but only modify their own
CREATE POLICY "Users can view all prompts" ON prompts
    FOR SELECT USING (true);

CREATE POLICY "Users can create prompts" ON prompts
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own prompts" ON prompts
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own prompts" ON prompts
    FOR DELETE USING (auth.uid() = created_by);

-- User inputs: Users can only access their own inputs
CREATE POLICY "Users can view their own inputs" ON user_inputs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inputs" ON user_inputs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Generation results: Users can only access their own results
CREATE POLICY "Users can view their own results" ON generation_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own results" ON generation_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own results" ON generation_results
    FOR UPDATE USING (auth.uid() = user_id);

-- Audit logs: Users can only view their own audit logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Storage policies for file uploads
CREATE POLICY "Users can upload input images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'input_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view input images" ON storage.objects
    FOR SELECT USING (bucket_id = 'input_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload output images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'output_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view output images" ON storage.objects
    FOR SELECT USING (bucket_id = 'output_images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seed initial data

-- Insert default AI models
INSERT INTO models (id, name, provider, price_per_1k_tokens) VALUES
    ('gpt-4.1', 'GPT-4.1', 'openai', 0.06),
    ('o3', 'o3', 'openai', 0.15),
    ('gpt-4o', 'GPT-4o', 'openai', 0.005)
ON CONFLICT (id) DO NOTHING;

-- Insert default prompt template
INSERT INTO prompts (name, description, template_text, json_prefix, json_suffix, use_placeholder, created_by) VALUES
    (
        'MetX Default Template',
        'Default template for generating MetX dashboard JSON',
        'Generate a MetX dashboard configuration based on the following requirements: {{output}}',
        '{"version": "1.0", "dashboard": {',
        '}}',
        true,
        NULL
    )
ON CONFLICT DO NOTHING;

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_prompts_updated_at 
    BEFORE UPDATE ON prompts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for audit logging
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
$$ language 'plpgsql';

-- Create audit triggers
CREATE TRIGGER prompts_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON prompts
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER generation_results_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON generation_results
    FOR EACH ROW EXECUTE FUNCTION create_audit_log(); 