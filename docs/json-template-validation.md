# JSON Template Validation System

## Overview

The MetX JSON Template Validation System automatically validates and fixes generated JSON configurations to ensure compatibility with Meteomatics import requirements. This system prevents import failures by validating model identifiers, color map names, and background style IDs against authoritative template files.

## Features

### Automatic Template Validation
- **Model Validation**: Ensures model fields contain valid identifiers from the official Meteomatics model list
- **Color Map Validation**: Validates color_map fields against supported color map names
- **Background Style Validation**: Checks background map style IDs against available options
- **Auto-Fix**: Automatically replaces invalid values with sensible defaults

### Layer Structure Validation
- Fixes common layer type name errors (e.g., `IsolineLayerDescription` → `IsoLinesLayerDescription`)
- Relocates properties from `custom_options` to root level where appropriate
- Standardizes property names for consistency

### JSON Formatting Fixes
- Corrects irregular spacing and indentation issues
- Fixes trailing commas and missing commas
- Ensures proper MetX JSON structure

## Template Files

The validation system uses three authoritative template files:

### `examples/templates/models.json`
Contains 43+ valid model identifiers including:
- `mix` (Meteomatics Mix - default fallback)
- `ecmwf-ifs` (ECMWF Integrated Forecasting System)
- `dwd-icon-global` (DWD ICON Global)
- `ncep-gfs` (NCEP Global Forecast System)
- And many more...

### `examples/templates/colorMaps.json`
Contains 100+ valid color map names including:
- `t_europe` (Temperature Europe - default fallback)
- `precip_segmented` (Precipitation Segmented)
- `wind_speed_europe_segmented` (Wind Speed Europe)
- `radar_reflectivity_segmented` (Radar Reflectivity)
- And many more...

### `examples/templates/backgroundMapStyles.json`
Contains 20+ valid background style IDs including:
- `topographique` (Maptiler Topographique - default fallback)
- `hybrid` (Maptiler Satellite Hybrid)
- `basic` (Maptiler Basic)
- UUID-based custom styles
- And many more...

## Usage

### In Generation Pipeline
The validation system is automatically integrated into the generation pipeline:

```typescript
import { JsonValidator } from '../utils/JsonValidator';

// Validate and fix generated JSON
const result = JsonValidator.validateJson(generatedJson, {
  autoFix: true,
  requireMetXStructure: true,
  indentSize: 2
});

if (result.isValid) {
  return result.fixedJson;
} else {
  throw new Error(`JSON validation failed: ${result.errors.join(', ')}`);
}
```

### Manual Validation
You can also validate JSON manually:

```typescript
import { JsonValidator } from './utils/JsonValidator';

const validationResult = JsonValidator.validateJson(jsonString, {
  autoFix: true,
  requireMetXStructure: true
});

console.log('Is valid:', validationResult.isValid);
console.log('Fixed JSON:', validationResult.fixedJson);
console.log('Warnings:', validationResult.warnings);
```

## Validation Rules

### Model Field Validation
- **Field**: `model` (string)
- **Scope**: All layer types that support model specification
- **Action**: Replace invalid models with `"mix"`
- **Example**: `"invalid-model"` → `"mix"`

### Color Map Validation
- **Field**: `color_map` (string)
- **Scope**: All layer types that support color mapping
- **Action**: Replace invalid color maps with `"t_europe"`
- **Example**: `"invalid-colormap"` → `"t_europe"`

### Background Style Validation
- **Field**: `style` (string)
- **Scope**: `BackgroundMapDescription` layers only
- **Action**: Replace invalid styles with `"topographique"`
- **Example**: `"invalid-style"` → `"topographique"`

### Layer Type Corrections
- **IsolineLayerDescription** → **IsoLinesLayerDescription**
- **WeatherFrontsLayerDescription**: Move styling properties from `custom_options` to root
- **IsoLinesLayerDescription**: Fix property names and locations
- **PressureSystemLayerDescription**: Ensure filter properties at root level

## Configuration Options

```typescript
interface JsonValidationOptions {
  autoFix: boolean;           // Enable automatic fixing (default: true)
  indentSize: number;         // JSON indentation size (default: 2)
  requireMetXStructure: boolean; // Enable MetX structure validation (default: false)
  strictMode: boolean;        // Enable strict validation (default: false)
}
```

## Error Handling

The validation system provides detailed error information:

```typescript
interface JsonValidationResult {
  isValid: boolean;           // Whether JSON is valid
  originalJson: string;       // Original input JSON
  fixedJson: string | null;   // Fixed JSON (if autoFix enabled)
  errors: string[];          // Validation errors
  warnings: string[];        // Validation warnings
  fixed: boolean;            // Whether fixes were applied
}
```

## Testing

The system includes comprehensive test coverage:

- **22 unit tests** covering all validation scenarios
- **Template validation tests** for models, color maps, and background styles
- **Structure validation tests** for layer type corrections
- **Real-world scenario tests** based on actual import failures

Run tests with:
```bash
npm test -- JsonValidator.test.ts
```

## Integration Points

### GenerationService
- Validates all generated JSON before returning to user
- Applies fixes automatically during generation process
- Logs validation warnings for debugging

### App.tsx
- Uses validation during JSON construction
- Ensures proper indentation and structure
- Integrates with download functionality

## Benefits

1. **Prevents Import Failures**: Ensures generated JSON can be imported into Meteomatics
2. **Automatic Correction**: Fixes common issues without manual intervention  
3. **Consistent Quality**: Maintains high-quality JSON output across all generations
4. **Backwards Compatibility**: Preserves valid existing configurations
5. **Developer Friendly**: Clear error messages and comprehensive test coverage

## Future Enhancements

- Dynamic template file updates from Meteomatics API
- Additional layer type validations
- Custom validation rules per organization
- Integration with real-time Meteomatics compatibility checking