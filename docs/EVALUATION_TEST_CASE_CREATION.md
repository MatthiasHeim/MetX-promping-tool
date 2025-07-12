# Evaluation Test Case Creation Guide

This document describes the streamlined process for creating evaluation test cases from MetX dashboard JSON files.

## Overview

Evaluation test cases are used to benchmark AI model performance in generating MetX dashboard configurations. Each test case contains:
- A user prompt describing the desired dashboard
- Expected JSON layer configuration
- Source file reference
- Metadata (name, description, active status)

## Process

### 1. Input Requirements

You need two things:
1. **Dashboard JSON file** - A MetX export containing one or more dashboard tabs
2. **Prompt list** - Corresponding user prompts for each dashboard

### 2. Data Structure

MetX JSON files contain a `tabs` array, where each tab represents a dashboard:
```json
{
  "tabs": [
    {
      "id": 68510,
      "title": "EU Overview",
      "maps": [
        {
          "layers": [
            // Layer configurations go here
          ]
        }
      ]
    }
  ]
}
```

### 3. Extraction Rules

For each tab, extract:
- **Layers**: All layer configurations from the first map in the tab
- **Title**: Use tab title as basis for test case name
- **Prompt**: Match with provided prompt list (in order)

### 4. Multiple Maps Handling ⚠️

**Important**: Check the number of maps per tab:

- **Single map (`maps.length === 1`)**: ✅ Good test case
  - Extract layers from the single map
  - Represents a focused weather scenario
  
- **Multiple maps (`maps.length > 1`)**: ❌ Poor test case
  - Usually model comparison dashboards (e.g., ECMWF vs ICON)
  - Side-by-side visualizations for human comparison
  - Combining layers creates unrealistic scenarios
  - **Recommendation**: Skip or ask for confirmation before creating

#### Example of Multiple Maps Issue:
```json
// Tab with 2 maps - comparison dashboard
{
  "title": "ECMWF vs ICON Precipitation",
  "maps": [
    {
      "title": "ECMWF-IFS",
      "layers": [/* ECMWF precipitation layers */]
    },
    {
      "title": "DWD IconD2", 
      "layers": [/* ICON precipitation layers */]
    }
  ]
}
```

**Problem**: Merging these layers would create a dashboard showing both ECMWF and ICON precipitation simultaneously, which is not a realistic user request.

**Solution**: Either skip this tab or create separate test cases for each map (though this may not reflect real user behavior).

### 5. Test Case Fields

When creating test cases, populate:
- `name`: Descriptive name based on tab title and functionality
- `description`: Brief explanation of what the dashboard tests
- `user_prompt`: Exact prompt text provided
- `expected_json`: Array of layer configurations from the dashboard
- `source`: File path of the source JSON
- `is_active`: Always set to `true`

## Recommended Workflow: Use Supabase MCP

**Best Practice**: Use Supabase MCP directly instead of the automated script for better control and error handling.

### Steps:
1. **Provide file and prompts** to Claude Code
2. **Claude analyzes the JSON** and checks for multiple maps
3. **Claude warns about poor test cases** (multiple maps)
4. **Claude creates test cases** using `mcp__supabase__execute_sql`
5. **Review and confirm** the results

### Request Format:

```
Create test cases from: eval_inputs/dashboard.json
Prompts:
1. "First dashboard prompt"
2. "Second dashboard prompt"
3. "Third dashboard prompt"
```

### Multiple Maps Example Response:
```
⚠️ Warning: Tab "ECMWF vs ICON Precipitation" has 2 maps (comparison dashboard)
This creates unrealistic test scenarios by combining all layers.
Proceed anyway? (y/n)
```

## Example Usage

### Input
```
File: eval_inputs/weather_examples.json
Prompts:
1. "Show temperature and pressure over Europe"
2. "Create precipitation forecast for Germany"
```

### Expected Output
Two test cases will be created:
- One for the first tab with temperature/pressure layers
- One for the second tab with precipitation layers

## Automation Script

A script is available at `scripts/create_test_cases.ts` that automates this process:

```bash
npm run create-test-cases -- --file path/to/dashboard.json --prompts "prompt1,prompt2,prompt3"
```

## Tips

1. **Prompt Order**: Ensure prompts are listed in the same order as tabs in the JSON
2. **File Paths**: Use relative paths from the project root for source references
3. **Naming**: Keep test case names descriptive but concise
4. **Validation**: Always verify the extracted layers match the intended dashboard

## Common Issues

- **Missing Layers**: Ensure the dashboard JSON contains a `maps` array with `layers`
- **Prompt Mismatch**: Number of prompts must match number of tabs
- **Invalid JSON**: Verify the source file is valid JSON before processing

## Database Schema

Test cases are stored in the `evaluation_test_cases` table:
```sql
CREATE TABLE evaluation_test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  user_prompt text NOT NULL,
  expected_json jsonb NOT NULL,
  source text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```