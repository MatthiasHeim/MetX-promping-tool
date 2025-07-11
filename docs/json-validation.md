# JSON Validation System

This document describes the standalone JSON validation and formatting utility for MetX, designed to fix common JSON formatting issues in AI-generated weather dashboard configurations.

## Overview

The `JsonValidator` utility provides comprehensive JSON validation, automatic fixing of common formatting errors, and MetX-specific structure validation. It's particularly useful for processing AI-generated JSON that may contain formatting inconsistencies.

## Features

- **Automatic JSON fixing** for common formatting issues
- **MetX-specific validation** for dashboard JSON structures
- **Standalone utility** that can be used throughout the application
- **Comprehensive error reporting** with detailed feedback
- **Configurable options** for different validation scenarios

## Usage

### Basic JSON Validation

```typescript
import { JsonValidator } from '../utils/JsonValidator';

const jsonString = '{"name": "test", "value": 123,}'; // Invalid trailing comma
const result = JsonValidator.validateJson(jsonString);

if (result.isValid) {
  console.log('Fixed JSON:', result.fixedJson);
} else {
  console.log('Errors:', result.errors);
}
```

### MetX Layer JSON Validation

```typescript
const layerJson = `{
  "layers": [            {  // Extra spaces
    "id": 600001,
    "kind": "BackgroundMapDescription"
  }]
}`;

const result = JsonValidator.validateLayerJson(layerJson);

if (result.isValid) {
  console.log('Validated and fixed layer JSON:', result.fixedJson);
} else {
  console.log('Validation failed:', result.errors);
}
```

### Integration with GenerationService

The validation is automatically integrated into the generation pipeline:

```typescript
import { GenerationService } from '../services/generation/GenerationService';

const result = await GenerationService.executeGeneration(
  prompt,
  model,
  imageUrl,
  jsonPrefix,
  jsonSuffix
);

if (result.json_validation) {
  console.log('JSON was validated:', result.json_validation.isValid);
  console.log('JSON was fixed:', result.json_validation.wasFixed);
  console.log('Fixed JSON:', result.json_validation.fixedJson);
}
```

## Configuration Options

```typescript
interface JsonValidationOptions {
  autoFix: boolean;         // Attempt to fix JSON errors (default: true)
  indentSize: number;       // Spaces for indentation (default: 2)
  requireMetXStructure: boolean; // Validate MetX-specific structure (default: false)
  strictMode: boolean;      // Enable strict validation (default: false)
}
```

## Common Issues Fixed

### 1. Irregular Spacing
**Before:**
```json
{"layers": [            {"id": 600001}]
```

**After:**
```json
{
  "layers": [
    {
      "id": 600001
    }
  ]
}
```

### 2. Trailing Commas
**Before:**
```json
{"a": 1, "b": 2,}
```

**After:**
```json
{
  "a": 1,
  "b": 2
}
```

### 3. Missing Commas
**Before:**
```json
{"a": 1 "b": 2}
```

**After:**
```json
{
  "a": 1,
  "b": 2
}
```

### 4. MetX Layer Array Formatting
**Before:**
```json
"layers": [            {
  "id": 600001,
  "kind": "BackgroundMapDescription"
}]
```

**After:**
```json
"layers": [
  {
    "id": 600001,
    "kind": "BackgroundMapDescription"
  }
]
```

## API Reference

### `JsonValidator.validateJson(jsonString, options?)`

Main validation method that checks and optionally fixes JSON.

**Parameters:**
- `jsonString: string` - The JSON string to validate
- `options: Partial<JsonValidationOptions>` - Optional configuration

**Returns:** `JsonValidationResult`

### `JsonValidator.validateLayerJson(layerJson, options?)`

Validates MetX layer JSON specifically with enhanced structure checking.

**Parameters:**
- `layerJson: string` - The layer JSON string to validate
- `options: Partial<JsonValidationOptions>` - Optional configuration

**Returns:** `JsonValidationResult`

### `JsonValidator.formatJson(jsonString, indentSize?)`

Utility method to format valid JSON with consistent indentation.

**Parameters:**
- `jsonString: string` - Valid JSON string to format
- `indentSize: number` - Number of spaces for indentation (default: 2)

**Returns:** `string` - Formatted JSON string

### `JsonValidator.isValidJson(jsonString)`

Quick check if a string is valid JSON.

**Parameters:**
- `jsonString: string` - String to check

**Returns:** `boolean` - True if valid JSON

## Result Structure

```typescript
interface JsonValidationResult {
  isValid: boolean;        // Whether the JSON is valid after processing
  originalJson: string;    // The original input JSON string
  fixedJson: string | null; // The fixed JSON string (null if unfixable)
  errors: string[];        // Array of error messages
  warnings: string[];      // Array of warning messages
  fixed: boolean;          // Whether the JSON was modified during fixing
}
```

## MetX Structure Validation

When `requireMetXStructure` is enabled, the validator checks for:

- Required fields: `id`, `tabs`
- Proper array structures for `tabs`, `maps`, `layers`
- Layer-specific fields: `kind`, `id`, `index`
- Nested structure integrity

## Error Handling

The validator gracefully handles various error scenarios:

- **Parse errors**: Reports specific JSON syntax issues
- **Structure errors**: Identifies missing required fields
- **Formatting issues**: Provides detailed fix descriptions
- **Unfixable errors**: Returns original string with error details

## Integration Examples

### In Generation Pipeline

```typescript
// In GenerationService.executeGeneration()
if (result.success && result.content && (jsonPrefix || jsonSuffix)) {
  const fullJson = this.processJsonOutput(result.content, jsonPrefix, jsonSuffix);
  const validation = this.validateAndFixJson(fullJson, true);
  
  return {
    ...result,
    json_validation: validation
  };
}
```

### In UI Components

```typescript
// In a component that processes JSON
const handleJsonSubmit = (jsonString: string) => {
  const validation = JsonValidator.validateJson(jsonString, {
    autoFix: true,
    requireMetXStructure: true
  });
  
  if (validation.isValid) {
    // Use validation.fixedJson
    processValidJson(validation.fixedJson);
  } else {
    // Show validation.errors to user
    setErrors(validation.errors);
  }
};
```

## Testing

The validator includes comprehensive tests covering:

- Basic JSON validation
- Common formatting fixes
- MetX-specific structure validation
- Error handling scenarios
- Real-world MetX JSON examples

Run tests with:
```bash
npm test -- JsonValidator
```

## Future Enhancements

Potential improvements for the validation system:

1. **Custom validation rules** for specific MetX layer types
2. **Performance optimizations** for large JSON structures
3. **Additional fix patterns** based on real-world usage
4. **Integration with JSON Schema** for more precise validation
5. **Visual diff tools** to show exactly what was fixed