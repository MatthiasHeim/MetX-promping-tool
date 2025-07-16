import { describe, it, expect } from 'vitest'
import { constructCompleteJson } from './jsonConstruction'

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