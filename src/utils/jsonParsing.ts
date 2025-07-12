/**
 * Utility functions for parsing LLM JSON responses consistently across the application
 */

export interface ParsedLLMResponse {
  success: boolean;
  data: any;
  error?: string;
}

/**
 * Parse LLM response with advanced handling for common LLM output patterns
 * This function handles:
 * - Markdown code blocks (```json ... ```)
 * - Comma-separated JSON objects that should be arrays
 * - Various LLM output inconsistencies
 * - Hidden characters and whitespace issues
 */
export function parseLLMJsonResponse(content: string): ParsedLLMResponse {
  try {
    let contentToParse = content.trim()
    
    // Remove any potential BOM (Byte Order Mark) or other hidden characters
    contentToParse = contentToParse.replace(/^\uFEFF/, '')
    
    // Strip markdown code blocks if present (```json ... ```)
    if (contentToParse.startsWith('```')) {
      const lines = contentToParse.split('\n')
      // Remove first line (```json or similar) and last line (```)
      if (lines.length > 2 && lines[lines.length - 1].trim() === '```') {
        contentToParse = lines.slice(1, -1).join('\n').trim()
        console.log('Stripped markdown code blocks from LLM response')
      }
    }
    
    // Debug logging for troubleshooting
    console.log('Parsing LLM response - length:', contentToParse.length)
    console.log('Starts with {:', contentToParse.startsWith('{'))
    console.log('Contains }, pattern:', /}\s*,\s*{/.test(contentToParse))
    console.log('First 100 chars:', contentToParse.substring(0, 100))
    
    // Check if content looks like comma-separated JSON objects (not wrapped in array)
    // This handles cases where models return {obj1},{obj2},{obj3} instead of [{obj1},{obj2},{obj3}]
    // Enhanced pattern: starts with {, contains }, followed by optional whitespace, comma, optional whitespace, and {
    if (contentToParse.startsWith('{') && 
        /}\s*,\s*{/.test(contentToParse) && 
        !contentToParse.startsWith('[')) {
      console.log('Detected comma-separated JSON objects, wrapping in array')
      contentToParse = '[' + contentToParse + ']'
    }
    
    const parsedData = JSON.parse(contentToParse)
    
    console.log('✅ Successfully parsed JSON, type:', Array.isArray(parsedData) ? 'array' : typeof parsedData)
    return {
      success: true,
      data: parsedData
    }
  } catch (parseError) {
    console.warn('❌ Failed to parse LLM JSON response:', parseError)
    console.log('Content that failed to parse (first 200 chars):', content.substring(0, 200))
    return {
      success: false,
      data: { raw_content: content },
      error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
    }
  }
}