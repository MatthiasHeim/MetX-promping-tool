# Quick Start: Creating Test Cases

## Recommended Process: Use Supabase MCP

**For best results, use the Supabase MCP directly** rather than the automated script. This gives better control and handles edge cases properly.

### Steps:
1. **Share the JSON file path and prompts** with Claude Code
2. **Claude will extract layers and create test cases** using `mcp__supabase__execute_sql`
3. **Review and confirm** the created test cases

### Example Request Format:
```
Create test cases from: eval_inputs/your-file.json
Prompts:
1. "First dashboard prompt"
2. "Second dashboard prompt" 
3. "Third dashboard prompt"
```

## Important Considerations

### Multiple Maps Warning ⚠️
- **Single map per tab**: Good test case (use first map's layers)
- **Multiple maps per tab**: Poor test case (side-by-side comparisons)
  - These are comparison dashboards (e.g., ECMWF vs ICON)
  - Combining all layers creates unrealistic test scenarios
  - **Ask before proceeding** with these test cases

### Quality Guidelines
- ✅ **Good**: Single dashboard with multiple weather layers
- ✅ **Good**: Focused weather scenarios (temperature, precipitation, etc.)
- ❌ **Poor**: Model comparison dashboards with side-by-side maps
- ❌ **Poor**: Complex multi-map layouts

## Fallback: Automated Script

If needed, the script is still available:

### Option 1: Interactive Mode
```bash
npm run create-test-cases
```

### Option 2: Command Line  
```bash
npm run create-test-cases -- --file "path/to/file.json" --prompts "prompt1,prompt2,prompt3"
```

**Note**: Script has limitations with prompts containing commas (especially non-English prompts)