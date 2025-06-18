import { describe, it, expect } from 'vitest'

// Helper function to construct complete JSON with prefix and suffix
const constructCompleteJson = (rawOutput: any, prompt: { json_prefix?: string | null, json_suffix?: string | null }): string => {
  const prefix = prompt.json_prefix || ''
  const suffix = prompt.json_suffix || ''
  
  // Format the raw output based on what the prompt expects
  let formattedOutput: string
  if (Array.isArray(rawOutput)) {
    // For arrays, format each element with proper indentation and remove outer brackets
    formattedOutput = rawOutput.map(item => 
      JSON.stringify(item, null, 2)
        .split('\n')
        .map(line => line ? '            ' + line : line) // Add indentation to match prefix structure
        .join('\n')
    ).join(',\n')
  } else {
    formattedOutput = JSON.stringify(rawOutput, null, 2)
  }
  
  return prefix + formattedOutput + suffix
}

describe('JSON Construction', () => {
  it('should construct complete JSON with prefix and suffix for arrays', () => {
    const mockPrompt = {
      json_prefix: '{"layers": [',
      json_suffix: ']}'
    }
    
    const rawLayers = [
      {
        "id": 600001,
        "kind": "BackgroundMapDescription",
        "style": "basic"
      },
      {
        "id": 600002,
        "kind": "WmsLayerDescription",
        "parameter_unit": "t_2m:C"
      }
    ]
    
    const result = constructCompleteJson(rawLayers, mockPrompt)
    
    // Should start with prefix
    expect(result).toContain('{"layers": [')
    // Should end with suffix
    expect(result).toContain(']}')
    // Should contain the layer content
    expect(result).toContain('"kind": "BackgroundMapDescription"')
    expect(result).toContain('"kind": "WmsLayerDescription"')
    
    // Should be valid JSON
    expect(() => JSON.parse(result)).not.toThrow()
    
    const parsed = JSON.parse(result)
    expect(parsed.layers).toHaveLength(2)
    expect(parsed.layers[0].kind).toBe('BackgroundMapDescription')
    expect(parsed.layers[1].kind).toBe('WmsLayerDescription')
  })

  it('should handle simple objects without prefix/suffix', () => {
    const mockPrompt = {
      json_prefix: null,
      json_suffix: null
    }
    
    const rawOutput = { test: 'value' }
    
    const result = constructCompleteJson(rawOutput, mockPrompt)
    
    expect(result).toBe('{\n  "test": "value"\n}')
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it('should handle empty prefix and suffix', () => {
    const mockPrompt = {
      json_prefix: '',
      json_suffix: ''
    }
    
    const rawOutput = { test: 'value' }
    
    const result = constructCompleteJson(rawOutput, mockPrompt)
    
    expect(result).toBe('{\n  "test": "value"\n}')
    expect(() => JSON.parse(result)).not.toThrow()
  })
}) 