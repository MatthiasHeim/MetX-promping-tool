-- Simple prompt setup for cloud database (no ON CONFLICT)
-- Run this in your Supabase SQL Editor

-- Drop table if it exists (clean start)
DROP TABLE IF EXISTS prompts;

-- Create prompts table
CREATE TABLE prompts (
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

-- Enable RLS
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Create policy for reading prompts
CREATE POLICY "Users can view all prompts" ON prompts
    FOR SELECT USING (true);

-- Insert the MetX Layer Generator prompt
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
- **Agriculture**: `soil_moisture_index_-15cm:idx`, `evapotranspiration_1h:mm`

## Layer Rules
1. **Always start with BackgroundMapDescription** (index: 0)
2. **Use incremental index values** (0, 1, 2, 3...)
3. **Use incremental ID values** starting from 600001
4. **Default opacity**: 0.7 for data layers, 1.0 for background
5. **Default model**: "mix" (unless specified otherwise)
6. **All timestamps**: Use "2025-01-01T12:00:00Z"
7. **Fixed IDs**: id_profile: 12000, id_cartographicmap: 120000

## Generation Logic
- **Simple request** → 2-4 layers (background + 1-3 weather layers)
- **Complex request** → 5-8 layers (background + multiple weather phenomena)
- **Match layer types to request**: 
  - Temperature maps → WmsLayerDescription
  - Wind → BarbsLayerDescription
  - Storms → LightningLayerDescription + WmsLayerDescription
  - Weather symbols → SymbolLayerDescription

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
    ); 