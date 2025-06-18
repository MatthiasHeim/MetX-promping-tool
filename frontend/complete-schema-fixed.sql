-- Complete MetX Database Schema Setup (Fixed)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create models table
CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL,
    model_id TEXT NOT NULL,
    description TEXT,
    max_tokens INTEGER,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint to existing prompts table if it doesn't exist
DO $$ 
BEGIN
    -- Check if unique constraint exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'prompts_name_key' 
        AND table_name = 'prompts'
    ) THEN
        -- First remove any duplicate names
        DELETE FROM prompts a USING prompts b 
        WHERE a.id > b.id AND a.name = b.name;
        
        -- Then add unique constraint
        ALTER TABLE prompts ADD CONSTRAINT prompts_name_key UNIQUE (name);
    END IF;
END $$;

-- Add missing columns to prompts table if they don't exist
DO $$
BEGIN
    -- Add version column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'version') THEN
        ALTER TABLE prompts ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'created_by') THEN
        ALTER TABLE prompts ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'updated_at') THEN
        ALTER TABLE prompts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create user_inputs table
CREATE TABLE IF NOT EXISTS user_inputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    input_text TEXT NOT NULL,
    prompt_id UUID REFERENCES prompts(id),
    model_id UUID REFERENCES models(id),
    session_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generation_results table
CREATE TABLE IF NOT EXISTS generation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_input_id UUID REFERENCES user_inputs(id),
    generated_content TEXT NOT NULL,
    model_response JSONB,
    processing_time_ms INTEGER,
    token_count INTEGER,
    cost_estimate DECIMAL(10,6),
    status TEXT DEFAULT 'completed',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_inputs_user_id ON user_inputs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inputs_created_at ON user_inputs(created_at);
CREATE INDEX IF NOT EXISTS idx_generation_results_user_input_id ON generation_results(user_input_id);
CREATE INDEX IF NOT EXISTS idx_generation_results_created_at ON generation_results(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS on all tables
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Public can view active models" ON models;
DROP POLICY IF EXISTS "Users can view all prompts" ON prompts;
DROP POLICY IF EXISTS "Users can view own inputs" ON user_inputs;
DROP POLICY IF EXISTS "Users can insert own inputs" ON user_inputs;
DROP POLICY IF EXISTS "Users can view own generation results" ON generation_results;
DROP POLICY IF EXISTS "Users can insert generation results for own inputs" ON generation_results;
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;

-- Create RLS policies

-- Models policies (public read, admin write)
CREATE POLICY "Public can view active models" ON models
    FOR SELECT USING (is_active = true);

-- Prompts policies (public read)
CREATE POLICY "Users can view all prompts" ON prompts
    FOR SELECT USING (true);

-- User inputs policies (users can only see their own)
CREATE POLICY "Users can view own inputs" ON user_inputs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inputs" ON user_inputs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Generation results policies (users can only see their own through user_inputs)
CREATE POLICY "Users can view own generation results" ON generation_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_inputs 
            WHERE user_inputs.id = generation_results.user_input_id 
            AND user_inputs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert generation results for own inputs" ON generation_results
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_inputs 
            WHERE user_inputs.id = generation_results.user_input_id 
            AND user_inputs.user_id = auth.uid()
        )
    );

-- Audit logs policies (users can only see their own)
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_models_updated_at ON models;
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prompts_updated_at ON prompts;
CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default models
INSERT INTO models (name, provider, model_id, description, max_tokens, temperature) VALUES
    ('GPT-4o', 'openai', 'gpt-4o', 'Latest GPT-4o model for complex reasoning', 4096, 0.7),
    ('GPT-4o Mini', 'openai', 'gpt-4o-mini', 'Faster, cost-effective GPT-4o variant', 4096, 0.7),
    ('GPT-3.5 Turbo', 'openai', 'gpt-3.5-turbo', 'Fast and efficient for most tasks', 4096, 0.7)
ON CONFLICT (name) DO NOTHING;

-- Update the MetX Layer Generator prompt (now with unique constraint)
INSERT INTO prompts (name, description, template_text, json_prefix, json_suffix, use_placeholder, created_by) VALUES
    (
        'MetX Layer Generator',
        'Specialized generator for MetX weather map layers using prefix/suffix templates',
        '# MetX Layer Generator

You are a specialized MetX Layer Generator. Your **only** job is to generate the layers array content that goes inside a MetX weather map.

## Input
- **Weather Request**: Description of what weather data to visualize
- **Geographic Context**: Location/region information (if provided)

## Output Requirements
- Generate **only** the JSON array contents that go between `"layers": [` and `]`
- **Do not** include the `"layers": [` opening or the `]` closing brackets
- **Do not** include any other JSON structure (no prefixes, suffixes, or wrapper objects)
- Each layer must be a complete, valid JSON object
- Use proper indentation (2 spaces) and line breaks for readability

## Layer Types & Examples

### 1. BackgroundMapDescription (Always first layer)
```json
{
  "time_created": "2025-01-01T12:00:00Z",
  "time_updated": "2025-01-01T12:00:00Z",
  "id": 600001,
  "id_profile": 12000,
  "id_cartographicmap": 120000,
  "index": 0,
  "opacity": 1,
  "show": true,
  "calibrated": null,
  "vertical_interpolation": null,
  "experimental": false,
  "custom_options": {
    "line_color": null,
    "show_state_border": null,
    "map_label_language": null
  },
  "kind": "BackgroundMapDescription",
  "style": "basic"
}
```

### 2. WmsLayerDescription (Weather data overlays)
```json
{
  "time_created": "2025-01-01T12:00:00Z",
  "time_updated": "2025-01-01T12:00:00Z",
  "id": 600002,
  "id_profile": 12000,
  "id_cartographicmap": 120000,
  "index": 1,
  "opacity": 0.7,
  "show": true,
  "calibrated": false,
  "vertical_interpolation": null,
  "experimental": false,
  "custom_options": {
    "init_date": null
  },
  "model": "mix",
  "parameter_unit": "t_2m:C",
  "ens_select": null,
  "show_init_time": false,
  "kind": "WmsLayerDescription",
  "color_map": "",
  "legend_visible": true
}
```

### 3. BarbsLayerDescription (Wind barbs)
```json
{
  "id": 600003,
  "id_profile": 12000,
  "id_cartographicmap": 120000,
  "time_created": "2025-01-01T12:00:00Z",
  "time_updated": "2025-01-01T12:00:00Z",
  "index": 2,
  "opacity": 0.7,
  "show": true,
  "calibrated": false,
  "vertical_interpolation": null,
  "experimental": false,
  "custom_options": {
    "icon_size": 0.5
  },
  "model": "mix",
  "parameter_unit": "wind_speed_10m:kn",
  "ens_select": null,
  "show_init_time": false,
  "step": 35,
  "kind": "BarbsLayerDescription",
  "parameter_unit_paired": "wind_dir_10m:d",
  "element_color": "#000000"
}
```

### 4. LightningLayerDescription
```json
{
  "id": 600004,
  "id_profile": 12000,
  "id_cartographicmap": 120000,
  "time_created": "2025-01-01T12:00:00Z",
  "time_updated": "2025-01-01T12:00:00Z",
  "index": 3,
  "opacity": 1,
  "show": true,
  "calibrated": null,
  "vertical_interpolation": null,
  "experimental": false,
  "custom_options": {},
  "model": "",
  "parameter_unit": "lightnings",
  "ens_select": null,
  "show_init_time": false,
  "kind": "LightningLayerDescription",
  "text_size": 41,
  "text_color": "#ff2c00",
  "legend_visible": true
}
```

### 5. SymbolLayerDescription (Weather symbols)
```json
{
  "time_created": "2025-01-01T12:00:00Z",
  "time_updated": "2025-01-01T12:00:00Z",
  "id": 600005,
  "id_profile": 12000,
  "id_cartographicmap": 120000,
  "step": 25,
  "index": 4,
  "opacity": 0.65,
  "show": true,
  "calibrated": null,
  "vertical_interpolation": null,
  "experimental": false,
  "custom_options": {
    "show_only_significant_weather": null,
    "icon_size": 0.4
  },
  "model": "mix",
  "parameter_unit": "weather_symbol_1h:idx",
  "ens_select": null,
  "show_init_time": false,
  "kind": "SymbolLayerDescription",
  "layer_type": "WeatherSymbol"
}
```

### 6. IsoLinesLayerDescription (Contour lines)
```json
{
  "id": 600006,
  "id_profile": 12000,
  "id_cartographicmap": 120000,
  "time_created": "2025-01-01T12:00:00Z",
  "time_updated": "2025-01-01T12:00:00Z",
  "index": 5,
  "opacity": 0.7,
  "show": true,
  "calibrated": null,
  "vertical_interpolation": null,
  "experimental": false,
  "custom_options": {},
  "model": "mix",
  "parameter_unit": "t_2m:C",
  "ens_select": null,
  "show_init_time": false,
  "kind": "IsoLinesLayerDescription",
  "line_width": 1,
  "line_color": "#000000",
  "text_size": 16,
  "text_color": "#000000",
  "values": null,
  "value_range": "-20,30,5",
  "filter_median": 1,
  "filter_gauss": 3
}
```

## Common Weather Parameters
- **Temperature**: `t_2m:C`, `t_max_2m_1h:C`, `t_min_2m_1h:C`
- **Precipitation**: `precip_1h:mm`, `precip_24h:mm`, `precip_type_intensity:idx`
- **Wind**: `wind_speed_10m:kn`, `wind_dir_10m:d`, `wind_gusts_10m_1h:ms`
- **Clouds**: `total_cloud_cover:octas`, `ceiling_height_agl:ft`
- **Pressure**: `msl_pressure:hPa`, `pressure_tendency_3h:hPa`
- **Snow**: `snow_fall:p`, `snow_depth:cm`
- **Lightning**: `lightnings`

## Layer Rules
1. **Always start with BackgroundMapDescription** (index: 0)
2. **Use incremental index values** (0, 1, 2, 3...)
3. **Use incremental ID values** starting from 600001
4. **Default opacity**: 0.7 for data layers, 1.0 for background
5. **Default model**: "mix" (unless specified otherwise)
6. **All timestamps**: Use "2025-01-01T12:00:00Z"
7. **Fixed IDs**: id_profile: 12000, id_cartographicmap: 120000

## Response Format
Return **only** the layer objects separated by commas, properly formatted with 2-space indentation. No other text, explanations, or JSON wrapper structure.',
        '{
  "id": 12000,
  "title": "{{DASHBOARD_TITLE}}",
  "tab_active": 70000,
  "use_global_datetime": false,
  "global_datetime": {
    "is_relative": true,
    "is_series": false,
    "is_auto_time_refresh_on": false,
    "abs_start": "2025-01-01T00:00:00Z",
    "abs_end": "2025-01-02T00:00:00Z",
    "rel_rounding_on": true,
    "rel_position": "now_with_15min_precision",
    "rel_rounding_direction": "backward",
    "rel_shift_on": true,
    "rel_start": "PT-15M",
    "rel_end": "P1D",
    "temporal_resolution": "PT3H",
    "fps": 10,
    "id": 12100,
    "id_profile": 12000,
    "time_created": "2025-01-01T12:00:00Z",
    "time_updated": "2025-01-01T12:00:00Z"
  },
  "id_account": 1000,
  "time_created": "2025-01-01T12:00:00Z",
  "time_updated": "2025-01-01T12:00:00Z",
  "tabs": [
    {
      "id": 70000,
      "id_profile": 12000,
      "time_created": "2025-01-01T12:00:00Z",
      "time_updated": "2025-01-01T12:00:00Z",
      "title": "{{TAB_TITLE}}",
      "order": 1,
      "is_favorite": false,
      "datetime": {
        "is_relative": true,
        "is_series": false,
        "is_auto_time_refresh_on": false,
        "abs_start": "2025-01-01T00:00:00Z",
        "abs_end": "2025-01-02T00:00:00Z",
        "rel_rounding_on": true,
        "rel_position": "now_with_15min_precision",
        "rel_rounding_direction": "backward",
        "rel_shift_on": true,
        "rel_start": "PT-15M",
        "rel_end": "P1D",
        "temporal_resolution": "PT3H",
        "fps": 10,
        "id": 70000,
        "id_profile": 12000,
        "time_created": "2025-01-01T12:00:00Z",
        "time_updated": "2025-01-01T12:00:00Z"
      },
      "layouts": [
        {
          "gridCellLayout": {
            "gridColumnStart": 1,
            "gridColumnEnd": 97,
            "gridRowStart": 1,
            "gridRowEnd": 97
          },
          "id": 170000,
          "id_tab": 70000,
          "type": "Map",
          "id_tool": 120000
        }
      ],
      "viewports": [
        {
          "kind": "ViewportFull",
          "center_lng": {{CENTER_LNG}},
          "center_lat": {{CENTER_LAT}},
          "zoom": {{ZOOM_LEVEL}},
          "southWest_lng": {{SW_LNG}},
          "southWest_lat": {{SW_LAT}},
          "northEast_lng": {{NE_LNG}},
          "northEast_lat": {{NE_LAT}},
          "id": 130000,
          "id_profile": 12000,
          "lastUpdatedBy": 120000
        }
      ],
      "country_plots": [],
      "energy_plots": [],
      "maps": [
        {
          "gridCellLayout": {
            "gridColumnStart": 1,
            "gridColumnEnd": 97,
            "gridRowStart": 1,
            "gridRowEnd": 97
          },
          "id": 120000,
          "id_profile": 12000,
          "id_tab": 70000,
          "id_viewport": 130000,
          "time_created": "2025-01-01T12:00:00Z",
          "time_updated": "2025-01-01T12:00:00Z",
          "title": "{{MAP_TITLE}}",
          "titleStyle": {{MAP_TITLE_STYLE}},
          "time_offset_mins": 0,
          "legend_size": null,
          "map_projection": {{MAP_PROJECTION}},
          "lod_bias": 0,
          "layers": [',
        '          ],
          "drawing": null
        }
      ],
      "notes": [],
      "plots": [],
      "location_tables": [],
      "tephigrams": [],
      "weather_tables": []
    }
  ]
}',
        true,
        NULL
    )
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description,
    template_text = EXCLUDED.template_text,
    json_prefix = EXCLUDED.json_prefix,
    json_suffix = EXCLUDED.json_suffix,
    use_placeholder = EXCLUDED.use_placeholder,
    updated_at = NOW(); 