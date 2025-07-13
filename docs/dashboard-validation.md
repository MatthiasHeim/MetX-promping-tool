# Dashboard Validation Service

## Overview

The Dashboard Validation Service (`src/utils/dashboardValidator.ts`) provides comprehensive validation and automatic fixing of MetX dashboard JSON structures to ensure successful uploads to the MetX platform.

## Purpose

MetX has strict validation requirements for dashboard imports. Generated dashboards often fail to import due to:
- Missing required fields
- Incorrect field values or data types
- Inconsistent ID relationships
- Invalid layer parameters
- Structural validation failures

This service automatically detects and fixes these issues to ensure 100% compatibility with MetX imports.

## Core Functions

### `validateAndFixDashboard(dashboard: any)`

Main entry point that validates and fixes a dashboard JSON object.

**Parameters:**
- `dashboard` (any): Raw dashboard JSON object

**Returns:**
```typescript
{
  dashboard: any,           // Fixed dashboard object
  validation: ValidationResult // Validation results
}
```

**Example:**
```typescript
import { validateAndFixDashboard } from './utils/dashboardValidator';

const result = validateAndFixDashboard(rawDashboard);
console.log('Validation passed:', result.validation.isValid);
console.log('Fixed dashboard:', result.dashboard);
```

### `validateDashboardLayers(dashboard: any)`

Validates all layers in a dashboard against their type-specific requirements.

**Returns:**
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

### `generateMissingIds(dashboard: any)`

Generates missing IDs and fixes structural issues in dashboard components.

**Fixes Applied:**
- Missing IDs for dashboard, tabs, layouts, viewports, maps, and layers
- ID relationship consistency
- Missing timestamps
- Layer indexing issues
- Field consistency problems
- Parameter validation issues

## Layer Type Requirements

The validator enforces specific field requirements for each layer type:

### Universal Required Fields
All layer types must have:
```typescript
[
  'id', 'id_profile', 'id_cartographicmap', 'index', 'kind', 
  'opacity', 'show', 'calibrated', 'vertical_interpolation', 
  'experimental', 'custom_options', 'time_created', 'time_updated'
]
```

### Weather Model Fields
Weather-related layers also require:
```typescript
[
  'model', 'parameter_unit', 'ens_select', 'show_init_time'
]
```

### Layer-Specific Requirements

#### BackgroundMapDescription
```typescript
[
  ...UNIVERSAL_REQUIRED_FIELDS,
  'style'
]
```

#### WmsLayerDescription
```typescript
[
  ...UNIVERSAL_REQUIRED_FIELDS,
  ...WEATHER_MODEL_FIELDS,
  'color_map',
  'legend_visible'
]
```

#### WindAnimationLayerDescription
```typescript
[
  ...UNIVERSAL_REQUIRED_FIELDS,
  ...WEATHER_MODEL_FIELDS,
  'color_map',
  'parameter_unit_paired'  // Required for wind layers
]
```

#### BarbsLayerDescription
```typescript
[
  ...UNIVERSAL_REQUIRED_FIELDS,
  ...WEATHER_MODEL_FIELDS,
  'element_color',
  'parameter_unit_paired',
  'step'
]
```

[Additional layer types documented with their specific requirements...]

## Critical Fixes Applied

### 1. ID Relationship Consistency
```typescript
// Before
{
  "layouts": [{"id_tool": 8959}],
  "viewports": [{"lastUpdatedBy": 20830}],
  "maps": [{"id": 39908}]
}

// After
{
  "layouts": [{"id_tool": 39908}],      // ✅ Matches map ID
  "viewports": [{"lastUpdatedBy": 39908}], // ✅ Matches map ID
  "maps": [{"id": 39908}]
}
```

### 2. Field Value Corrections
```typescript
// Before
{
  "calibrated": false,                    // ❌ Causes layer rejection
  "map_projection": {                     // ❌ Causes map rejection
    "name": "mercator",
    "center": null,
    "parallels": null
  }
}

// After
{
  "calibrated": null,                     // ✅ Required by MetX
  "map_projection": null                  // ✅ Required by MetX
}
```

### 3. Layer Parameter Fixes
```typescript
// Before - WindAnimationLayerDescription
{
  "parameter_unit": "wind_speed_u_10m:ms", // ❌ Invalid format
  "color_map": "wind_jet"                  // ❌ Wrong color map
  // ❌ Missing parameter_unit_paired
}

// After
{
  "parameter_unit": "wind_speed_10m:ms",   // ✅ Correct format
  "parameter_unit_paired": "wind_dir_10m:d", // ✅ Required field
  "color_map": "gray_transparent"          // ✅ Correct color map
}
```

### 4. Missing Timestamps
Adds required timestamp fields to all components:
```typescript
{
  "time_created": "2025-07-13T09:19:40.591Z",
  "time_updated": "2025-07-13T09:19:40.591Z"
}
```

### 5. Layer Indexing
Ensures sequential layer indices starting from 0:
```typescript
// Before: [1, 2, 4]  ❌ Gap in sequence
// After:  [0, 1, 2]  ✅ Sequential from 0
```

### 6. Background Map Custom Options
```typescript
// Before
{
  "custom_options": {
    "show_state_border": false,   // ❌ Should be null
    "map_label_language": null    // ❌ Should be "en"
  }
}

// After
{
  "custom_options": {
    "show_state_border": null,    // ✅ Correct value
    "map_label_language": "en"    // ✅ Required for visibility
  }
}
```

## Integration

The validator is integrated throughout the application via the shared processing utility:

### Generation Pipeline
```typescript
// In App.tsx
const processing = processDashboardForGeneration(parsedJson);
```

### Evaluation Pipeline
```typescript
// In EvaluationService.ts
const processing = processDashboardForEvaluation(dashboardJson);
```

### Download Operations
```typescript
// In GenerationsView.tsx and EvaluationComparisonPanel.tsx
const downloadResult = createDownloadableJson(dashboard);
```

## Error Handling

The validator provides detailed error reporting:

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];    // Critical issues that prevent import
  warnings: string[];  // Non-critical issues that may affect functionality
}
```

**Example Error Messages:**
- `"Missing required fields for WmsLayerDescription: color_map, legend_visible"`
- `"Fixed layer index in Tab 0, Map 0: 2 → 1"`
- `"Fixed layout id_tool: now references map 39908"`

## Testing

The validator includes comprehensive test coverage:

```bash
# Run validator tests
npm test -- dashboardValidator.test.ts

# Test specific layer type validation
npm test -- --grep "WindAnimationLayerDescription"
```

## Performance Considerations

- **Validation Speed**: Processes typical dashboards (3-5 layers) in <10ms
- **Memory Usage**: Creates deep copies for safety without affecting original objects
- **Batch Processing**: Efficiently handles multiple fixes in a single pass

## Best Practices

1. **Always validate before MetX upload**: Use `validateAndFixDashboard()` on all generated content
2. **Check validation results**: Review `errors` and `warnings` arrays for insights
3. **Test with real MetX imports**: Validate fixes work with actual MetX platform
4. **Update requirements**: Keep layer type requirements current with MetX API changes

## Troubleshooting

### Common Issues

**Dashboard imports but layers don't show:**
- Check `calibrated` field is `null`, not `false`
- Verify `parameter_unit` values match Meteomatics API format
- Ensure `color_map` values are valid for the parameter type

**Entire map structure rejected:**
- Verify `map_projection` is `null`, not an object
- Check ID relationships between layouts, viewports, and maps
- Ensure all required timestamps are present

**Layer validation failures:**
- Review layer-specific field requirements
- Check for missing `parameter_unit_paired` on wind layers
- Verify `vertical_interpolation` values per layer type

### Debug Mode

Enable verbose logging:
```typescript
const result = validateAndFixDashboard(dashboard, { verbose: true });
```

This will log all fixes applied and validation steps performed.

## API Reference

### Types

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface LayerValidationContext {
  dashboardId: number;
  tabId: number;
  mapId: number;
  layerIndex: number;
}
```

### Constants

```typescript
// Universal fields required by all layer types
const UNIVERSAL_REQUIRED_FIELDS: readonly string[]

// Weather model fields for meteorological layers
const WEATHER_MODEL_FIELDS: readonly string[]

// Layer type specific requirements mapping
const LAYER_TYPE_REQUIREMENTS: Record<string, string[]>
```

### Helper Functions

```typescript
// Validate individual layer
validateLayer(layer: any, context: LayerValidationContext): ValidationResult

// Check ISO timestamp format
isValidISOTimestamp(timestamp: string): boolean

// Fix layer indexing sequence
fixLayerIndexing(dashboard: any): string[]

// Fix field consistency issues
fixFieldConsistency(dashboard: any): string[]

// Fix layer parameter issues
fixLayerParameters(dashboard: any): string[]

// Fix missing timestamps
fixMissingTimestamps(dashboard: any): string[]

// Fix ID consistency
fixIdConsistency(dashboard: any): string[]
```