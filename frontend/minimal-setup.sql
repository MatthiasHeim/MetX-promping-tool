-- Minimal setup for prompts table
-- Copy and paste this into Supabase SQL Editor

CREATE TABLE prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    template_text TEXT NOT NULL,
    json_prefix TEXT,
    json_suffix TEXT,
    use_placeholder BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO prompts (name, description, template_text, json_prefix, json_suffix, use_placeholder) VALUES (
    'MetX Layer Generator',
    'Specialized generator for MetX weather map layers',
    '# MetX Layer Generator

Generate only the layers array content for MetX weather maps.

## Output Requirements
- Generate only JSON array contents between "layers": [ and ]
- Do not include opening/closing brackets
- Use proper 2-space indentation

## Layer Types

### BackgroundMapDescription (Always first)
```json
{
  "id": 600001,
  "index": 0,
  "opacity": 1,
  "show": true,
  "kind": "BackgroundMapDescription",
  "style": "basic"
}
```

### WmsLayerDescription (Weather overlays)
```json
{
  "id": 600002,
  "index": 1,
  "opacity": 0.7,
  "show": true,
  "model": "mix",
  "parameter_unit": "t_2m:C",
  "kind": "WmsLayerDescription"
}
```

Return only layer objects, comma-separated, properly formatted.',
    '{"layers": [',
    ']}',
    true
); 