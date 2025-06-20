-- Add Prompt Versioning Support
-- This migration adds support for prompt versioning

-- First, create a prompt_versions table that will store all versions of each prompt
CREATE TABLE IF NOT EXISTS prompt_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    template_text TEXT NOT NULL,
    json_prefix TEXT,
    json_suffix TEXT,
    use_placeholder BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT false,
    
    -- Ensure unique version numbers per prompt
    UNIQUE(prompt_id, version_number)
);

-- Enable RLS on prompt_versions
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for prompt_versions
CREATE POLICY "Users can view all prompt versions" ON prompt_versions
    FOR SELECT USING (true);

CREATE POLICY "Users can create prompt versions" ON prompt_versions
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Update the existing prompts table to have a current_version field
-- and add an is_active field to track which version is currently active
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create function to automatically create a prompt version when a prompt is updated
CREATE OR REPLACE FUNCTION create_prompt_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create a version if this is an update (not insert)
    IF TG_OP = 'UPDATE' THEN
        -- Check if any of the versioned fields have changed
        IF (OLD.name IS DISTINCT FROM NEW.name OR
            OLD.description IS DISTINCT FROM NEW.description OR
            OLD.template_text IS DISTINCT FROM NEW.template_text OR
            OLD.json_prefix IS DISTINCT FROM NEW.json_prefix OR
            OLD.json_suffix IS DISTINCT FROM NEW.json_suffix OR
            OLD.use_placeholder IS DISTINCT FROM NEW.use_placeholder) THEN
            
            -- Increment the version number
            NEW.version = OLD.version + 1;
            NEW.current_version = NEW.version;
            
            -- Deactivate all previous versions
            UPDATE prompt_versions 
            SET is_active = false 
            WHERE prompt_id = NEW.id;
            
            -- Create a new version record
            INSERT INTO prompt_versions (
                prompt_id,
                version_number,
                name,
                description,
                template_text,
                json_prefix,
                json_suffix,
                use_placeholder,
                created_by,
                is_active
            ) VALUES (
                NEW.id,
                NEW.version,
                NEW.name,
                NEW.description,
                NEW.template_text,
                NEW.json_prefix,
                NEW.json_suffix,
                NEW.use_placeholder,
                NEW.created_by,
                true
            );
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        -- For new prompts, create the initial version
        INSERT INTO prompt_versions (
            prompt_id,
            version_number,
            name,
            description,
            template_text,
            json_prefix,
            json_suffix,
            use_placeholder,
            created_by,
            is_active
        ) VALUES (
            NEW.id,
            NEW.version,
            NEW.name,
            NEW.description,
            NEW.template_text,
            NEW.json_prefix,
            NEW.json_suffix,
            NEW.use_placeholder,
            NEW.created_by,
            true
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic prompt versioning
DROP TRIGGER IF EXISTS prompts_versioning_trigger ON prompts;
CREATE TRIGGER prompts_versioning_trigger
    BEFORE INSERT OR UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION create_prompt_version();

-- Create function to rollback to a previous version
CREATE OR REPLACE FUNCTION rollback_prompt_to_version(
    prompt_id_param UUID,
    version_number_param INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    version_record RECORD;
BEGIN
    -- Get the version record
    SELECT * INTO version_record
    FROM prompt_versions
    WHERE prompt_id = prompt_id_param AND version_number = version_number_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Version % not found for prompt %', version_number_param, prompt_id_param;
    END IF;
    
    -- Temporarily disable the trigger to avoid creating a new version
    SET session_replication_role = replica;
    
    -- Update the main prompt record with the version data
    UPDATE prompts SET
        name = version_record.name,
        description = version_record.description,
        template_text = version_record.template_text,
        json_prefix = version_record.json_prefix,
        json_suffix = version_record.json_suffix,
        use_placeholder = version_record.use_placeholder,
        current_version = version_record.version_number,
        updated_at = NOW()
    WHERE id = prompt_id_param;
    
    -- Deactivate all versions
    UPDATE prompt_versions 
    SET is_active = false 
    WHERE prompt_id = prompt_id_param;
    
    -- Activate the selected version
    UPDATE prompt_versions 
    SET is_active = true 
    WHERE prompt_id = prompt_id_param AND version_number = version_number_param;
    
    -- Re-enable the trigger
    SET session_replication_role = DEFAULT;
    
    RETURN TRUE;
END;
$$ language 'plpgsql';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_active ON prompt_versions(prompt_id, is_active) WHERE is_active = true;

-- Migrate existing prompts to have initial versions
-- This will be handled by the trigger for new inserts, but we need to handle existing data
INSERT INTO prompt_versions (
    prompt_id,
    version_number,
    name,
    description,
    template_text,
    json_prefix,
    json_suffix,
    use_placeholder,
    created_by,
    created_at,
    is_active
)
SELECT 
    id,
    version,
    name,
    description,
    template_text,
    json_prefix,
    json_suffix,
    use_placeholder,
    created_by,
    created_at,
    true
FROM prompts
WHERE NOT EXISTS (
    SELECT 1 FROM prompt_versions 
    WHERE prompt_versions.prompt_id = prompts.id
);

-- Update current_version for existing prompts
UPDATE prompts 
SET current_version = version
WHERE current_version IS NULL; 