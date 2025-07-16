/**
 * Dashboard Processing Utility
 * 
 * Shared utility for processing and validating MetX dashboard JSON across the application.
 * This ensures consistent dashboard validation and fixing for all generation, evaluation,
 * and download operations.
 */

import { validateAndFixDashboard } from './dashboardValidator'
import type { ValidationResult } from './dashboardValidator'
import { constructCompleteJson } from './jsonConstruction';

export interface DashboardProcessingResult {
  /** The processed and validated dashboard JSON */
  dashboard: any
  /** Validation results including errors and warnings */
  validation: ValidationResult
  /** Whether the dashboard was modified during processing */
  wasFixed: boolean
  /** Summary of what was fixed */
  fixesSummary: string[]
}

/**
 * Process a dashboard JSON by validating and fixing it for MetX compatibility.
 * This is the main entry point for all dashboard processing in the application.
 * 
 * @param dashboardJson - The dashboard JSON to process
 * @param options - Processing options
 * @returns Processing result with validated dashboard and metadata
 */
export function processDashboardJson(
  dashboardJson: any,
  options: {
    /** Whether to log processing steps to console */
    verbose?: boolean
    /** Context for logging (e.g., 'generation', 'evaluation', 'download') */
    context?: string
  } = {}
): DashboardProcessingResult {
  const { verbose = false, context = 'processing' } = options
  
  if (verbose) {
    console.log(`🔍 [${context}] Processing dashboard JSON...`)
  }
  
  // Validate and fix the dashboard
  const { dashboard: fixedDashboard, validation } = validateAndFixDashboard(dashboardJson)
  
  // Determine what was fixed
  const wasFixed = !validation.isValid || validation.warnings.length > 0
  const fixesSummary: string[] = []
  
  if (validation.errors.length > 0) {
    fixesSummary.push(`Fixed ${validation.errors.length} validation errors`)
  }
  
  if (validation.warnings.length > 0) {
    fixesSummary.push(`Resolved ${validation.warnings.length} warnings`)
  }
  
  if (!wasFixed) {
    fixesSummary.push('No fixes needed')
  }
  
  if (verbose) {
    if (validation.errors.length > 0) {
      console.warn(`⚠️ [${context}] Dashboard validation errors found:`, validation.errors)
    }
    if (validation.warnings.length > 0) {
      console.warn(`⚠️ [${context}] Dashboard validation warnings:`, validation.warnings)
    }
    if (!validation.isValid) {
      console.log(`❌ [${context}] Dashboard validation failed, but using fixed version`)
    } else {
      console.log(`✅ [${context}] Dashboard validation passed`)
    }
    
    if (fixesSummary.length > 0) {
      console.log(`🔧 [${context}] Fixes applied:`, fixesSummary)
    }
  }
  
  return {
    dashboard: fixedDashboard,
    validation,
    wasFixed,
    fixesSummary
  }
}

/**
 * Process dashboard JSON for generation results.
 * Includes specific logging and context for the generation pipeline.
 */
export function processDashboardForGeneration(dashboardJson: any): DashboardProcessingResult {
  return processDashboardJson(dashboardJson, {
    verbose: true,
    context: 'generation'
  })
}

/**
 * Process dashboard JSON for evaluation.
 * Includes specific context for the evaluation pipeline.
 */
export function processDashboardForEvaluation(dashboardJson: any): DashboardProcessingResult {
  return processDashboardJson(dashboardJson, {
    verbose: false, // Less verbose for evaluation to reduce noise
    context: 'evaluation'
  })
}

/**
 * Process dashboard JSON for download.
 * Ensures downloaded files are always valid for MetX upload.
 */
export function processDashboardForDownload(dashboardJson: any): DashboardProcessingResult {
  return processDashboardJson(dashboardJson, {
    verbose: true,
    context: 'download'
  })
}

/**
 * Helper function to construct complete dashboard JSON from layers and prompt.
 * This combines the existing JSON construction logic with dashboard validation.
 */
export function constructAndProcessCompleteJson(
  layersContent: any,
  prompt: any,
  _userInput: string,
  context: string = 'construction'
): {
  completeJson: any
  processing: DashboardProcessingResult
  error?: string
} {
  try {
    // Use the imported construction utility
    
    // Construct complete JSON with prefix and suffix
    const completeJsonString = constructCompleteJson(layersContent, prompt)
    const parsedJson = JSON.parse(completeJsonString)
    
    // Process and validate the dashboard
    const processing = processDashboardJson(parsedJson, {
      verbose: true,
      context
    })
    
    return {
      completeJson: processing.dashboard,
      processing
    }
  } catch (error) {
    console.error(`Failed to construct complete JSON in ${context}:`, error)
    return {
      completeJson: null,
      processing: {
        dashboard: null,
        validation: {
          isValid: false,
          errors: [`JSON construction failed: ${error}`],
          warnings: []
        },
        wasFixed: false,
        fixesSummary: []
      },
      error: `JSON construction failed: ${error}`
    }
  }
}

/**
 * Get database storage object for validation results.
 * Standardizes how validation results are stored across the application.
 */
export function getValidationStorageObject(processing: DashboardProcessingResult) {
  return {
    validation_errors: processing.validation.errors.length > 0 ? processing.validation.errors : null,
    validation_warnings: processing.validation.warnings.length > 0 ? processing.validation.warnings : null,
    validation_passed: processing.validation.isValid,
    validation_timestamp: new Date().toISOString()
  }
}

/**
 * Create a download-ready JSON string with proper formatting.
 * Ensures consistent formatting for all dashboard downloads.
 */
export function createDownloadableJson(dashboardJson: any, filename?: string): {
  json: string
  blob: Blob
  filename: string
} {
  // Process the dashboard to ensure it's valid
  const processing = processDashboardForDownload(dashboardJson)
  
  // Create formatted JSON string
  const jsonString = JSON.stringify(processing.dashboard, null, 2)
  
  // Create blob for download
  const blob = new Blob([jsonString], { type: 'application/json' })
  
  // Generate filename if not provided
  const finalFilename = filename || `dashboard_${processing.dashboard?.id || 'export'}_${Date.now()}.json`
  
  return {
    json: jsonString,
    blob,
    filename: finalFilename
  }
}