import { useState, useEffect } from 'react'
import { LoginForm } from './components/auth/LoginForm'
import { SignUpForm } from './components/auth/SignUpForm'
import { GenerationForm } from './components/generation/GenerationForm'
import { GenerationsView } from './components/generation/GenerationsView'
import { EvaluationDisplay } from './components/evaluation/EvaluationDisplay'
import { EvaluationComparisonPanel } from './components/evaluation/EvaluationComparisonPanel'
import { OverviewPage } from './components/OverviewPage'
import { EvaluationPage } from './pages/EvaluationPage'
import { AuthService } from './services/auth/AuthService'

import { GenerationService } from './services/generation/GenerationService'
import { GenerationResultService } from './services/generation/GenerationResultService'
import { UserInputService } from './services/inputs/UserInputService'
import { PromptService } from './services/prompts/PromptService'
import { ModelService } from './services/models/ModelService'
import { PromptVersionHistory } from './components/generation/PromptVersionHistory'
import { parseLLMJsonResponse } from './utils/jsonParsing'
import { processDashboardForGeneration, createDownloadableJson } from './utils/dashboardProcessing'
import type { Model, Prompt } from './types/database'
import type { EvaluationResult } from './services/evaluation/EvaluationService'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false) // Require login
  const [generationResults, setGenerationResults] = useState<any[]>([])
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([])
  const [currentView, setCurrentView] = useState<'overview' | 'generation' | 'generations' | 'prompts' | 'editor' | 'evaluations'>('overview')
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [isProcessingResults, setIsProcessingResults] = useState(false)
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    resultIndex: number | null;
    rating: number;
    comment: string;
  }>({
    isOpen: false,
    resultIndex: null,
    rating: 0,
    comment: ''
  })
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [models, setModels] = useState<Model[]>([])
  const [promptValidation, setPromptValidation] = useState<{
    errors: string[]
    warnings: string[]
  }>({ errors: [], warnings: [] })
  const [isInitializingForm, setIsInitializingForm] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [showSignUp, setShowSignUp] = useState(false)

  // Version history modal state
  const [versionHistoryModal, setVersionHistoryModal] = useState<{
    isOpen: boolean
    prompt: Prompt | null
  }>({ isOpen: false, prompt: null })

  // Form state for prompt editor
  const [promptForm, setPromptForm] = useState({
    name: '',
    description: '',
    template_text: '',
    json_prefix: '',
    json_suffix: '',
    use_placeholder: false,
    prompt_type: 'generation' as 'generation' | 'judge'
  })

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Load prompts and models when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadPrompts()
      loadModels()
    }
  }, [isAuthenticated])

  const checkAuthStatus = async () => {
    try {
      const user = await AuthService.getCurrentUser()
      if (user) {
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
    }
  }

  // Run validation when form state changes (but not during initialization)
  useEffect(() => {
    if (!isInitializingForm && (promptForm.name || promptForm.template_text)) {
      // Debounce validation to avoid excessive calls during typing
      const timeoutId = setTimeout(() => {
        console.log('Form state changed, running validation via useEffect')
        validatePrompt()
      }, 300)
      
      return () => clearTimeout(timeoutId)
    }
  }, [promptForm, isInitializingForm])

  const loadPrompts = async () => {
    setIsLoadingPrompts(true)
    try {
      const fetchedPrompts = await PromptService.fetchPrompts()
      setPrompts(fetchedPrompts)
    } catch (error) {
      console.error('Error loading prompts:', error)
      // Keep empty array if there's an error
    } finally {
      setIsLoadingPrompts(false)
    }
  }

  const loadModels = async () => {
    try {
      const fetchedModels = await ModelService.fetchModels()
      setModels(fetchedModels)
    } catch (error) {
      console.error('Error loading models:', error)
      // Keep empty array if there's an error
    }
  }

  const handleLogin = async (loginData: { email: string; password: string }) => {
    setAuthLoading(true)
    setAuthError(null)
    
    try {
      const result = await AuthService.signIn(loginData.email, loginData.password)
      
      if (result.error) {
        setAuthError(result.error.message)
        return
      }
      
      if (result.user) {
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error('Login error:', error)
      setAuthError('An unexpected error occurred')
    } finally {
      setAuthLoading(false)
    }
  }

  // Helper function to get coordinates for different locations
  const getLocationCoordinates = (userInput: string) => {
    const inputLower = userInput.toLowerCase()
    
    // Location mapping with coordinates and bounds
    const locations = {
      hawaii: {
        center_lat: 21.3099,
        center_lng: -157.8581,
        zoom: 7,
        sw_lat: 18.9108,
        sw_lng: -161.0578,
        ne_lat: 22.2350,
        ne_lng: -154.8061
      },
      switzerland: {
        center_lat: 47.3769,
        center_lng: 8.5417,
        zoom: 7,
        sw_lat: 45.8180,
        sw_lng: 5.9559,
        ne_lat: 47.8084,
        ne_lng: 10.4921
      },
      europe: {
        center_lat: 50.8503,
        center_lng: 4.3517,
        zoom: 5,
        sw_lat: 35.0,
        sw_lng: -10.0,
        ne_lat: 65.0,
        ne_lng: 30.0
      },
      usa: {
        center_lat: 39.8283,
        center_lng: -98.5795,
        zoom: 4,
        sw_lat: 24.396308,
        sw_lng: -125.000000,
        ne_lat: 49.384358,
        ne_lng: -66.885444
      },
      california: {
        center_lat: 36.7783,
        center_lng: -119.4179,
        zoom: 6,
        sw_lat: 32.5343,
        sw_lng: -124.4096,
        ne_lat: 42.0095,
        ne_lng: -114.1312
      },
      texas: {
        center_lat: 31.9686,
        center_lng: -99.9018,
        zoom: 6,
        sw_lat: 25.8371,
        sw_lng: -106.6456,
        ne_lat: 36.5007,
        ne_lng: -93.5083
      },
      florida: {
        center_lat: 27.7663,
        center_lng: -81.6868,
        zoom: 6,
        sw_lat: 24.9493,
        sw_lng: -87.6349,
        ne_lat: 31.0008,
        ne_lng: -79.9740
      },
      newyork: {
        center_lat: 43.2994,
        center_lng: -74.2179,
        zoom: 7,
        sw_lat: 40.4774,
        sw_lng: -79.7624,
        ne_lat: 45.0153,
        ne_lng: -71.7774
      },
      london: {
        center_lat: 51.5074,
        center_lng: -0.1278,
        zoom: 8,
        sw_lat: 51.2868,
        sw_lng: -0.5103,
        ne_lat: 51.6919,
        ne_lng: 0.3340
      },
      paris: {
        center_lat: 48.8566,
        center_lng: 2.3522,
        zoom: 8,
        sw_lat: 48.6157,
        sw_lng: 2.0619,
        ne_lat: 49.0755,
        ne_lng: 2.6362
      },
      tokyo: {
        center_lat: 35.6762,
        center_lng: 139.6503,
        zoom: 8,
        sw_lat: 35.3606,
        sw_lng: 139.2394,
        ne_lat: 35.8984,
        ne_lng: 140.1866
      },
      sydney: {
        center_lat: -33.8688,
        center_lng: 151.2093,
        zoom: 8,
        sw_lat: -34.1692,
        sw_lng: 150.5021,
        ne_lat: -33.4245,
        ne_lng: 151.3430
      },
      brazil: {
        center_lat: -14.2350,
        center_lng: -51.9253,
        zoom: 4,
        sw_lat: -33.7489,
        sw_lng: -73.9828,
        ne_lat: 5.2648,
        ne_lng: -34.7932
      },
      canada: {
        center_lat: 56.1304,
        center_lng: -106.3468,
        zoom: 3,
        sw_lat: 41.6751,
        sw_lng: -141.0027,
        ne_lat: 83.1139,
        ne_lng: -52.6363
      },
      australia: {
        center_lat: -25.2744,
        center_lng: 133.7751,
        zoom: 4,
        sw_lat: -43.6345,
        sw_lng: 113.3381,
        ne_lat: -10.0622,
        ne_lng: 153.6397
      },
      india: {
        center_lat: 20.5937,
        center_lng: 78.9629,
        zoom: 4,
        sw_lat: 8.0885,
        sw_lng: 68.1766,
        ne_lat: 35.5087,
        ne_lng: 97.3954
      },
      china: {
        center_lat: 35.8617,
        center_lng: 104.1954,
        zoom: 4,
        sw_lat: 18.1693,
        sw_lng: 73.4994,
        ne_lat: 53.5609,
        ne_lng: 134.7728
      },
      japan: {
        center_lat: 36.2048,
        center_lng: 138.2529,
        zoom: 5,
        sw_lat: 24.0461,
        sw_lng: 122.9337,
        ne_lat: 45.5228,
        ne_lng: 153.9874
      },
      africa: {
        center_lat: -8.7832,
        center_lng: 34.5085,
        zoom: 3,
        sw_lat: -34.8333,
        sw_lng: -17.6258,
        ne_lat: 37.3444,
        ne_lng: 51.4167
      }
    }
    
    // Check for location mentions in user input
    for (const [location, coords] of Object.entries(locations)) {
      if (inputLower.includes(location)) {
        return coords
      }
    }
    
    // Check for alternative names
    const alternativeNames: Record<string, string> = {
      'new york': 'newyork',
      'ny': 'newyork',
      'nyc': 'newyork',
      'uk': 'london',
      'england': 'london',
      'britain': 'london',
      'france': 'paris',
      'deutschland': 'europe',
      'germany': 'europe',
      'italia': 'europe',
      'italy': 'europe',
      'españa': 'europe',
      'spain': 'europe',
      'united states': 'usa',
      'america': 'usa',
      'us': 'usa'
    }
    
    for (const [altName, location] of Object.entries(alternativeNames)) {
      if (inputLower.includes(altName)) {
        const coords = locations[location as keyof typeof locations]
        if (coords) {
          return coords
        }
      }
    }
    
    // Default to Switzerland if no location detected
    return locations.switzerland
  }

  // Helper function to construct complete JSON with prefix and suffix
  const constructCompleteJson = (rawOutput: any, prompt: Prompt, userInput?: string): string => {
    let prefix = prompt.json_prefix || ''
    const suffix = prompt.json_suffix || ''
    
    // If no prefix/suffix, just return the raw output as formatted JSON
    if (!prefix && !suffix) {
      return JSON.stringify(rawOutput, null, 2)
    }
    
    // Get location-specific coordinates
    const locationCoords = getLocationCoordinates(userInput || '')
    
    // Replace placeholders in prefix with location-specific values
    prefix = prefix
      .replace(/\{\{DASHBOARD_TITLE\}\}/g, 'Generated Dashboard')
      .replace(/\{\{TAB_TITLE\}\}/g, 'Main View')
      .replace(/\{\{MAP_TITLE\}\}/g, 'Weather Map')
      .replace(/\{\{MAP_TITLE_STYLE\}\}/g, 'null')
      .replace(/\{\{MAP_PROJECTION\}\}/g, '{"name": "mercator", "center": null, "parallels": null}')
      .replace(/\{\{CENTER_LNG\}\}/g, locationCoords.center_lng.toString())
      .replace(/\{\{CENTER_LAT\}\}/g, locationCoords.center_lat.toString())
      .replace(/\{\{ZOOM_LEVEL\}\}/g, locationCoords.zoom.toString())
      .replace(/\{\{SW_LNG\}\}/g, locationCoords.sw_lng.toString())
      .replace(/\{\{SW_LAT\}\}/g, locationCoords.sw_lat.toString())
      .replace(/\{\{NE_LNG\}\}/g, locationCoords.ne_lng.toString())
      .replace(/\{\{NE_LAT\}\}/g, locationCoords.ne_lat.toString())
    
    // Format the raw output - let AI provide the layers content directly without extra indentation
    let formattedOutput: string
    if (Array.isArray(rawOutput)) {
      // For arrays, format each element with proper indentation and remove outer brackets
      formattedOutput = rawOutput.map(item => 
        JSON.stringify(item, null, 2)
          .split('\n')
          .map(line => line ? '  ' + line : line) // Use proper 2-space indentation
          .join('\n')
      ).join(',\n')
    } else {
      formattedOutput = JSON.stringify(rawOutput, null, 2)
        .split('\n')
        .map(line => line ? '  ' + line : line) // Use proper 2-space indentation
        .join('\n')
    }
    
    const result = prefix + formattedOutput + suffix
    
    // Use comprehensive JSON validation and fixing
    const validation = GenerationService.validateAndFixJson(result, true)
    
    if (validation.isValid) {
      if (validation.wasFixed) {
        console.log('JSON was automatically fixed during generation')
        console.log('Validation warnings:', validation.warnings)
      }
      return validation.fixedJson
    } else {
      console.warn('JSON validation failed:', validation.errors)
      console.log('Invalid JSON preview:', result.substring(0, 200) + '...')
      // Return the raw output as a valid JSON fallback
      return JSON.stringify({
        layers: Array.isArray(rawOutput) ? rawOutput : [rawOutput],
        note: 'JSON validation failed, returning raw layers',
        validation_errors: validation.errors,
        original_prefix: prefix.substring(0, 100) + '...',
        original_suffix: suffix.substring(0, 100) + '...'
      }, null, 2)
    }
  }

  // Helper function to copy JSON to clipboard
  const handleCopyRawJson = async (result: any) => {
    try {
      const rawJson = JSON.stringify(result.raw_json, null, 2)
      await navigator.clipboard.writeText(rawJson)
      console.log('Raw LLM output copied to clipboard')
    } catch (error) {
      console.error('Failed to copy raw JSON:', error)
    }
  }

  // Helper function to copy complete raw LLM response for debugging
  const handleCopyRawResponse = async (result: any) => {
    try {
      const rawResponse = result.raw_llm_response || 'No raw response available'
      await navigator.clipboard.writeText(rawResponse)
      console.log('Complete raw LLM response copied to clipboard')
    } catch (error) {
      console.error('Failed to copy raw response:', error)
    }
  }

  const handleCopyJson = async (result: any, prompt: Prompt, userInput?: string) => {
    try {
      const completeJson = constructCompleteJson(result.raw_json, prompt, userInput)
      await navigator.clipboard.writeText(completeJson)
      console.log('Complete JSON copied to clipboard')
    } catch (error) {
      console.error('Failed to copy JSON:', error)
    }
  }

  // Helper function to download JSON with validation
  const handleDownloadJson = (result: any, prompt: Prompt, userInput?: string) => {
    try {
      const completeJsonString = constructCompleteJson(result.raw_json, prompt, userInput)
      const parsedJson = JSON.parse(completeJsonString)
      
      // Use shared utility to create validated downloadable JSON
      const { blob, filename } = createDownloadableJson(
        parsedJson, 
        `metx-dashboard-${result.model_name}-${Date.now()}.json`
      )
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      console.log('Validated JSON downloaded')
    } catch (error) {
      console.error('Failed to download JSON:', error)
    }
  }

  const handleGenerate = async (data: {
    text: string
    selectedModels: Model[]
    selectedPrompt: Prompt
    inputImage: File | null
  }) => {
    console.log('Generation request:', data)
    
    // Set processing state to show user that results are being processed
    setIsProcessingResults(true)
    
    try {
      // Get the current authenticated user's ID
      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser) {
        throw new Error('User not authenticated')
      }
      const userId = currentUser.id
      
      // Step 1: Create user input record in database
      const userInput = await UserInputService.createUserInput(
        userId,
        data.text,
        data.inputImage || undefined
      )
      console.log('Created user input:', userInput)
      
      // Process the prompt template with user input
      const processedPrompt = GenerationService.processPromptTemplate(
        data.selectedPrompt.template_text,
        data.text
      )
      
      // Use the image URL from the uploaded user input (Supabase storage URL)
      let imageUrl: string | undefined
      if (userInput.input_image_url) {
        imageUrl = userInput.input_image_url
      }
      
      // Execute real parallel generation using OpenAI
      const generationResult = await GenerationService.executeParallelGeneration(
        processedPrompt,
        data.selectedModels,
        imageUrl
      )
      
      // Step 2: Prepare generation results for database storage
      const generationResultsForDB = generationResult.results.map((result: any) => {
        let rawLlmOutput: any
        let final_json: any
        let validationResults: { errors: string[], warnings: string[], isValid: boolean } | null = null
        
        if (result.success && result.content) {
          // Use the shared JSON parsing utility for consistency with evaluation
          const parseResult = parseLLMJsonResponse(result.content)
          
          if (parseResult.success) {
            rawLlmOutput = parseResult.data
            
            // Check if it's a single layer object or array of layers
            let layersContent: any
            if (Array.isArray(rawLlmOutput)) {
              layersContent = rawLlmOutput
            } else if (rawLlmOutput && typeof rawLlmOutput === 'object') {
              // Check if it's the invalid structure with layer1_object, layer2_object, etc.
              const keys = Object.keys(rawLlmOutput)
              if (keys.some(key => key.includes('layer') && key.includes('object'))) {
                // Convert invalid structure to proper array
                layersContent = keys
                  .filter(key => key.includes('layer') && key.includes('object'))
                  .sort() // Sort to maintain order (layer1_object, layer2_object, etc.)
                  .map(key => rawLlmOutput[key])
                console.log('Converted invalid layer structure to array:', layersContent)
              } else {
                // Single layer object - wrap in array
                layersContent = [rawLlmOutput]
              }
            } else {
              throw new Error('Invalid layer structure')
            }
            
            // Construct complete JSON with prefix and suffix
            const completeJsonString = constructCompleteJson(layersContent, data.selectedPrompt, data.text)
            try {
              const parsedJson = JSON.parse(completeJsonString)
              
              // Step: Process and validate dashboard structure using shared utility
              const processing = processDashboardForGeneration(parsedJson)
              
              // Store validation results for database
              validationResults = {
                errors: processing.validation.errors,
                warnings: processing.validation.warnings,
                isValid: processing.validation.isValid
              }
              
              // Use the processed dashboard as final_json
              final_json = processing.dashboard
              
            } catch (jsonError) {
              console.error('Failed to parse complete JSON string:', jsonError)
              console.log('Complete JSON string that failed:', completeJsonString.substring(0, 500) + '...')
              // Fallback: use the raw layers content as final_json
              final_json = {
                layers: layersContent,
                error: 'JSON prefix/suffix combination failed, using raw layers'
              }
            }
            
          } else {
            // Parsing failed, use the fallback data from shared utility
            console.warn('JSON parsing failed, using fallback data:', parseResult.error)
            rawLlmOutput = parseResult.data
            final_json = rawLlmOutput
          }
        } else {
          // Handle error case
          rawLlmOutput = { error: result.error?.message || 'Generation failed' }
          final_json = rawLlmOutput
        }
        
        return {
          user_input_id: userInput.id,
          prompt_id: data.selectedPrompt.id,
          prompt_version: data.selectedPrompt.version,
          model_id: result.model_id,
          user_id: userId,
          raw_json: rawLlmOutput,
          raw_llm_response: result.content || null, // Store complete raw LLM response
          final_json: final_json,
          cost_chf: result.cost_chf,
          latency_ms: result.latency_ms,
          validation_errors: validationResults?.errors || null,
          validation_warnings: validationResults?.warnings || null,
          validation_passed: validationResults?.isValid || false,
          validation_timestamp: new Date().toISOString()
        }
      })
      
      // Step 3: Save generation results to database with automatic evaluation
      const savedResults = await GenerationResultService.createGenerationResultsWithUserInput(
        generationResultsForDB,
        data.text
      )
      console.log('Saved generation results to database with evaluation metrics:', savedResults)
      
      // Step 4: Create display objects for the UI
      const results = savedResults.map((dbResult: any) => {
        const completeJsonString = constructCompleteJson(dbResult.raw_json, data.selectedPrompt, data.text)
        
        return {
          id: dbResult.id, // Include database ID for future updates
          model_id: dbResult.model_id,
          model_name: data.selectedModels.find(m => m.id === dbResult.model_id)?.name || dbResult.model_id,
          prompt_used: data.selectedPrompt.name,
          user_input: data.text,
          raw_json: dbResult.raw_json,
          raw_llm_response: dbResult.raw_llm_response,
          final_json: dbResult.final_json,
          complete_json_string: completeJsonString,
          prompt: data.selectedPrompt,
          cost_chf: dbResult.cost_chf,
          latency_ms: dbResult.latency_ms,
          success: dbResult.raw_json && !dbResult.raw_json.error,
          manual_rating: dbResult.manual_score,
          manual_comment: dbResult.manual_comment
        }
      })
      
      // The evaluation metrics are now stored directly in the database
      // and included in the savedResults, so we can extract them for display
      const evaluations = savedResults
        .filter((dbResult: any) => dbResult.overall_score !== null)
        .map((dbResult: any) => ({
          overallScore: dbResult.overall_score,
          rationale: dbResult.overall_rationale,
          criteria: {
            parameterCompleteness: {
              score: dbResult.parameter_completeness_score,
              rationale: dbResult.parameter_completeness_rationale,
              foundParameters: [], // These would need to be stored separately if needed
              missingParameters: []
            },
            structureQuality: {
              score: dbResult.structure_quality_score,
              rationale: dbResult.structure_quality_rationale,
              hasValidStructure: dbResult.structure_quality_score >= 0.9,
              requiredFields: [],
              missingFields: []
            },
            layerCount: {
              score: dbResult.layer_count_score,
              rationale: dbResult.layer_count_rationale,
              layerCount: dbResult.layer_count
            },
            costEfficiency: {
              score: dbResult.cost_efficiency_score,
              rationale: dbResult.cost_efficiency_rationale
            },
            performance: {
              score: dbResult.performance_score,
              rationale: dbResult.performance_rationale
            }
          },
          timestamp: dbResult.evaluation_timestamp
        }))
      
      setGenerationResults(results)
      setEvaluationResults(evaluations)
      
    } catch (error) {
      console.error('Generation failed:', error)
      
      // Create error results for all models
      const errorResults = data.selectedModels.map(model => ({
        model_id: model.id,
        model_name: model.name,
        prompt_used: data.selectedPrompt.name,
        user_input: data.text,
        raw_json: { error: 'Generation failed: ' + (error as Error).message },
        final_json: { error: 'Generation failed' },
        complete_json_string: JSON.stringify({ error: 'Generation failed' }, null, 2),
        prompt: data.selectedPrompt,
        cost_chf: 0,
        latency_ms: 0,
        success: false
      }))
      
      setGenerationResults(errorResults)
      setEvaluationResults([])
    } finally {
      // Clear processing state regardless of success or failure
      setIsProcessingResults(false)
    }
  }

  const handleLogout = async () => {
    try {
      await AuthService.signOut()
      setIsAuthenticated(false)
  
      setGenerationResults([])
      setEvaluationResults([])
      setCurrentView('overview')
      setEditingPrompt(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt)
    initializePromptForm(prompt)
    setCurrentView('editor')
  }

  const handleDeletePrompt = async (prompt: Prompt) => {
    if (!confirm(`Are you sure you want to delete "${prompt.name}"?`)) {
      return
    }
    
    try {
      await PromptService.deletePrompt(prompt.id)
      // Refresh the prompt list
      await loadPrompts()
    } catch (error) {
      console.error('Error deleting prompt:', error)
      // In a real app, you'd show an error notification here
    }
  }

  const handleCreatePrompt = () => {
    setEditingPrompt(null)
    initializePromptForm(null)
    setCurrentView('editor')
  }

  const handleSetPromptAsDefault = async (prompt: Prompt) => {
    try {
      await PromptService.setPromptAsDefault(prompt.id)
      console.log('Prompt set as default successfully')
      // Reload prompts to reflect changes
      await loadPrompts()
    } catch (error) {
      console.error('Failed to set prompt as default:', error)
      alert('Failed to set prompt as default. Please try again.')
    }
  }

  const handleUnsetPromptAsDefault = async (prompt: Prompt) => {
    try {
      await PromptService.unsetPromptAsDefault(prompt.id)
      console.log('Prompt unset as default successfully')
      // Reload prompts to reflect changes
      await loadPrompts()
    } catch (error) {
      console.error('Failed to unset prompt as default:', error)
      alert('Failed to unset prompt as default. Please try again.')
    }
  }

  const handleSavePrompt = async () => {
    // Validate the prompt first
    const isValid = validatePrompt()
    
    if (!isValid) {
      console.log('Prompt validation failed:', promptValidation.errors)
      return // Don't save if validation fails
    }
    
    // Check for required fields
    if (!promptForm.name.trim()) {
      setPromptValidation((prev: { errors: string[], warnings: string[] }) => ({
        ...prev,
        errors: [...prev.errors, 'Prompt name is required']
      }))
      return
    }
    
    try {
      if (editingPrompt) {
        // Update existing prompt
        console.log('Updating prompt:', {
          id: editingPrompt.id,
          name: editingPrompt.name,
          new_name: promptForm.name
        })
        
        await PromptService.updatePrompt(editingPrompt.id, {
          name: promptForm.name,
          description: promptForm.description || undefined,
          template_text: promptForm.template_text,
          json_prefix: promptForm.prompt_type === 'generation' ? (promptForm.json_prefix || undefined) : undefined,
          json_suffix: promptForm.prompt_type === 'generation' ? (promptForm.json_suffix || undefined) : undefined,
          use_placeholder: promptForm.prompt_type === 'generation' ? promptForm.use_placeholder : true
        })
      } else {
        // Create new prompt
        await PromptService.createPrompt({
          name: promptForm.name,
          description: promptForm.description || undefined,
          template_text: promptForm.template_text,
          json_prefix: promptForm.prompt_type === 'generation' ? (promptForm.json_prefix || undefined) : undefined,
          json_suffix: promptForm.prompt_type === 'generation' ? (promptForm.json_suffix || undefined) : undefined,
          use_placeholder: promptForm.prompt_type === 'generation' ? promptForm.use_placeholder : true, // Judge prompts always use placeholders
          prompt_type: promptForm.prompt_type
        })
      }
      
      // Refresh the prompt list
      await loadPrompts()
      setEditingPrompt(null)
      setCurrentView('prompts')
    } catch (error) {
      console.error('Error saving prompt:', error)
      setPromptValidation((prev: { errors: string[], warnings: string[] }) => ({
        ...prev,
        errors: [...prev.errors, 'Failed to save prompt: ' + (error as Error).message]
      }))
    }
  }

  const handleCancelEdit = () => {
    setEditingPrompt(null)
    setCurrentView('prompts')
  }

  const handleViewVersionHistory = (prompt: Prompt) => {
    setVersionHistoryModal({ isOpen: true, prompt })
  }

  const handleVersionRollback = (updatedPrompt: Prompt) => {
    // Reload prompts to reflect the changes
    loadPrompts()
    // If we're currently editing this prompt, update the form with rolled back data
    if (editingPrompt && editingPrompt.id === updatedPrompt.id) {
      setEditingPrompt(updatedPrompt)
      initializePromptForm(updatedPrompt)
    }
    // Close the version history modal
    setVersionHistoryModal({ isOpen: false, prompt: null })
  }

  // Rating handlers
  const handleRateResult = (resultIndex: number) => {
    const existingRating = generationResults[resultIndex]?.manual_rating || 0
    const existingComment = generationResults[resultIndex]?.manual_comment || ''
    
    setRatingModal({
      isOpen: true,
      resultIndex,
      rating: existingRating,
      comment: existingComment
    })
  }

  const handleSaveRating = async () => {
    if (ratingModal.resultIndex === null) return

    try {
      const result = generationResults[ratingModal.resultIndex]
      
      // Update in database if we have a database ID
      if (result.id) {
        await GenerationResultService.updateGenerationResult(result.id, {
          manual_score: ratingModal.rating,
          manual_comment: ratingModal.comment
        })
        console.log('Rating saved to database')
      }

      // Update the result in local state
      const updatedResults = [...generationResults]
      updatedResults[ratingModal.resultIndex] = {
        ...updatedResults[ratingModal.resultIndex],
        manual_rating: ratingModal.rating,
        manual_comment: ratingModal.comment
      }

      setGenerationResults(updatedResults)
      setRatingModal({
        isOpen: false,
        resultIndex: null,
        rating: 0,
        comment: ''
      })
    } catch (error) {
      console.error('Error saving rating:', error)
      // Still update local state even if database update fails
      const updatedResults = [...generationResults]
      updatedResults[ratingModal.resultIndex] = {
        ...updatedResults[ratingModal.resultIndex],
        manual_rating: ratingModal.rating,
        manual_comment: ratingModal.comment
      }
      setGenerationResults(updatedResults)
      setRatingModal({
        isOpen: false,
        resultIndex: null,
        rating: 0,
        comment: ''
      })
    }
  }

  const handleCancelRating = () => {
    setRatingModal({
      isOpen: false,
      resultIndex: null,
      rating: 0,
      comment: ''
    })
  }

  // Prompt validation functions
  const validatePromptTemplate = (templateText: string, usePlaceholder: boolean, promptType: 'generation' | 'judge' = 'generation'): { errors: string[], warnings: string[] } => {
    const errors: string[] = []
    const warnings: string[] = []
    
    const trimmedText = templateText?.trim() || ''
    
    if (!trimmedText || trimmedText.length === 0) {
      errors.push('Template text is required')
      return { errors, warnings }
    }
    
    if (promptType === 'generation') {
      // Check for required {{user_input}} or {{output}} placeholder when use_placeholder is true
      if (usePlaceholder) {
        if (!trimmedText.includes('{{user_input}}') && !trimmedText.includes('{{output}}')) {
          errors.push('Template must include {{user_input}} placeholder when "Use placeholder" is enabled')
        }
      } else {
        if (trimmedText.includes('{{user_input}}') || trimmedText.includes('{{output}}')) {
          warnings.push('Template contains user input placeholder but "Use placeholder" is not enabled')
        }
      }
    } else if (promptType === 'judge') {
      // For judge prompts, check for required evaluation placeholders
      const requiredPlaceholders = ['{{user_input}}', '{{expected_json}}', '{{generated_json}}']
      const missingPlaceholders = requiredPlaceholders.filter(placeholder => !trimmedText.includes(placeholder))
      
      if (missingPlaceholders.length > 0) {
        errors.push(`Judge template must include: ${missingPlaceholders.join(', ')} placeholders`)
      }
      
      // Response format validation removed - enhanced parser handles multiple formats (XML, JSON, fallback patterns)
    }
    
    // Check for other common placeholders that might need attention
    const commonPlaceholders = ['{{location}}', '{{parameters}}', '{{region}}', '{{time}}']
    const foundPlaceholders = commonPlaceholders.filter(placeholder => 
      trimmedText.includes(placeholder)
    )
    
    if (foundPlaceholders.length > 0) {
      warnings.push(`Template contains unhandled placeholders: ${foundPlaceholders.join(', ')}. These will not be replaced automatically.`)
    }
    
    // Check for potential JSON structure issues in prefix/suffix - but be less strict
    const hasComplexJson = trimmedText.includes('{"') && trimmedText.includes('"}')
    
    if (hasComplexJson) {
      warnings.push('Template appears to contain JSON structure. Consider using JSON Prefix/Suffix fields instead.')
    }
    
    return { errors, warnings }
  }

  const validateJsonStructure = (prefix: string, suffix: string): { errors: string[], warnings: string[] } => {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check if prefix and suffix together form valid JSON structure when combined
    if (prefix && suffix) {
      try {
        // Replace common placeholders with valid test values before JSON validation
        const placeholderReplacements = {
          '{{DASHBOARD_TITLE}}': '"Test Dashboard"',
          '{{TAB_TITLE}}': '"Test Tab"', 
          '{{MAP_TITLE}}': '"Test Map"',
          '{{CENTER_LNG}}': '0',
          '{{CENTER_LAT}}': '0',
          '{{SW_LNG}}': '0',
          '{{SW_LAT}}': '0', 
          '{{NE_LNG}}': '0',
          '{{NE_LAT}}': '0',
          '{{ZOOM}}': '5'
        }
        
        let testPrefix = prefix
        let testSuffix = suffix
        
        // Replace all placeholders with valid JSON values
        Object.entries(placeholderReplacements).forEach(([placeholder, replacement]) => {
          testPrefix = testPrefix.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacement)
          testSuffix = testSuffix.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacement)
        })
        
        const testJson = testPrefix + '[]' + testSuffix // Test with minimal content
        JSON.parse(testJson)
        
        console.log('JSON validation passed with placeholder replacement')
      } catch (error) {
        console.log('JSON validation failed:', error, { prefix, suffix })
        errors.push('JSON Prefix and Suffix do not form valid JSON structure when combined (even after placeholder replacement)')
      }
    }
    
    // Check for common placeholder issues in prefix/suffix
    const allPlaceholders = ['{{DASHBOARD_TITLE}}', '{{TAB_TITLE}}', '{{MAP_TITLE}}', '{{CENTER_LNG}}', '{{CENTER_LAT}}', '{{SW_LNG}}', '{{SW_LAT}}', '{{NE_LNG}}', '{{NE_LAT}}', '{{ZOOM}}']
    
    const prefixPlaceholders = allPlaceholders.filter(placeholder => prefix.includes(placeholder))
    const suffixPlaceholders = allPlaceholders.filter(placeholder => suffix.includes(placeholder))
    
    if (prefixPlaceholders.length > 0 || suffixPlaceholders.length > 0) {
      const allFound = [...prefixPlaceholders, ...suffixPlaceholders]
      warnings.push(`JSON structure contains placeholders that will be replaced: ${allFound.join(', ')}`)
    }
    
    return { errors, warnings }
  }

  // Update form state when editing a prompt
  const initializePromptForm = (prompt: Prompt | null) => {
    // Clear validation first
    setPromptValidation({ errors: [], warnings: [] })
    
    if (prompt) {
      const formData = {
        name: prompt.name || '',
        description: prompt.description || '',
        template_text: prompt.template_text || '',
        json_prefix: prompt.json_prefix || '',
        json_suffix: prompt.json_suffix || '',
        use_placeholder: prompt.use_placeholder || false,
        prompt_type: (prompt.prompt_type as 'generation' | 'judge') || 'generation'
      }
      
      console.log('Initializing prompt form:', {
        prompt_name: prompt.name,
        use_placeholder: prompt.use_placeholder,
        has_user_input: (prompt.template_text || '').includes('{{user_input}}'),
        has_output: (prompt.template_text || '').includes('{{output}}'),
        form_data: formData
      })
      
      // Set initialization flag, update form, then clear flag after state update
      setIsInitializingForm(true)
      setPromptForm(formData)
      
      // Clear initialization flag after React has processed the state update
      setTimeout(() => {
        console.log('Clearing initialization flag - useEffect will handle validation')
        setIsInitializingForm(false)
      }, 100)
    } else {
      // Clear form
      setPromptForm({
        name: '',
        description: '',
        template_text: '',
        json_prefix: '',
        json_suffix: '',
        use_placeholder: false,
        prompt_type: 'generation'
      })
      setIsInitializingForm(false)
    }
  }

  // Validate entire prompt when form changes
  const validatePrompt = () => {
    // Skip validation if form is being initialized
    if (isInitializingForm) {
      console.log('Skipping validation - form is being initialized')
      return true
    }
    
    const templateValidation = validatePromptTemplate(promptForm.template_text, promptForm.use_placeholder, promptForm.prompt_type)
    // Only validate JSON structure for generation prompts
    const jsonValidation = promptForm.prompt_type === 'generation' 
      ? validateJsonStructure(promptForm.json_prefix, promptForm.json_suffix)
      : { errors: [], warnings: [] }
    
    const allErrors = [...templateValidation.errors, ...jsonValidation.errors]
    const allWarnings = [...templateValidation.warnings, ...jsonValidation.warnings]
    
    // Debug logging
    console.log('Validation Debug:', {
      template_text_raw: JSON.stringify(promptForm.template_text),
      template_text_length: promptForm.template_text?.length || 0,
      template_text_trimmed_length: (promptForm.template_text?.trim() || '').length,
      use_placeholder: promptForm.use_placeholder,
              has_user_input_placeholder: (promptForm.template_text || '').includes('{{user_input}}'),
        has_output_placeholder: (promptForm.template_text || '').includes('{{output}}'),
      template_errors: templateValidation.errors,
      json_errors: jsonValidation.errors,
      all_errors: allErrors,
      prompt_name: promptForm.name,
      json_prefix_preview: promptForm.json_prefix?.substring(0, 100) + '...',
      json_suffix_preview: promptForm.json_suffix?.substring(0, 100) + '...',
      form_state_complete: {
        name: promptForm.name,
        description: promptForm.description,
        template_text: !!promptForm.template_text,
        json_prefix: !!promptForm.json_prefix,
        json_suffix: !!promptForm.json_suffix,
        use_placeholder: promptForm.use_placeholder
      },
      is_initializing: isInitializingForm
    })
    
    setPromptValidation({ errors: allErrors, warnings: allWarnings })
    return allErrors.length === 0
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Meteomatics Logo */}
          <div className="text-center">
            <img 
              src="/meteomatics_logo.png" 
              alt="Meteomatics" 
              className="mx-auto h-32 w-auto mb-6"
            />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">MetX Prompting Tool</h1>
            <p className="text-gray-600">AI-powered dashboard generation</p>
          </div>

          {!showSignUp ? (
            <LoginForm 
              onSubmit={handleLogin}
              onSwitchToSignUp={() => setShowSignUp(true)}
              isLoading={authLoading}
              error={authError}
              showSignUpOption={true}
            />
          ) : (
            <SignUpForm 
              onSwitchToSignIn={() => setShowSignUp(false)}
            />
          )}

          {/* Lailix Logo and Credit */}
          <div className="text-center pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">Developed by</p>
            <a 
              href="https://lailix.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block hover:opacity-80 transition-opacity"
            >
              <img 
                src="/lailix_logo.png" 
                alt="Lailix - AI Experts" 
                className="mx-auto h-8 w-auto"
              />
            </a>
            <p className="text-xs text-gray-400 mt-2">
              <a 
                href="https://lailix.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-blue-600 transition-colors"
              >
                lailix.com
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <img 
                src="/meteomatics_logo.png" 
                alt="Meteomatics" 
                className="h-20 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">MetX Prompting Tool</h1>
                <p className="text-sm text-gray-600 mt-1">Generate dashboard configurations with AI</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
        
        {/* Modern Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setCurrentView('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  currentView === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Overview</span>
                </div>
              </button>
              <button
                onClick={() => setCurrentView('generation')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  currentView === 'generation'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate</span>
                </div>
              </button>
              <button
                onClick={() => setCurrentView('generations')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  currentView === 'generations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>All Generations</span>
                </div>
              </button>
              <button
                onClick={() => setCurrentView('prompts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  currentView === 'prompts' || currentView === 'editor'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Prompts</span>
                </div>
              </button>
              <button
                onClick={() => setCurrentView('evaluations')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  currentView === 'evaluations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Evaluations</span>
                </div>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {/* Overview View */}
          {currentView === 'overview' && (
            <OverviewPage 
              onNavigateToGenerate={() => setCurrentView('generation')}
              onNavigateToPrompts={() => setCurrentView('prompts')}
            />
          )}

          {/* Generation View */}
          {currentView === 'generation' && (
            <>
              <GenerationForm
                models={models}
                prompts={prompts}
                isProcessingResults={isProcessingResults}
                onGenerate={handleGenerate}
              />

              {/* Results Display */}
              {generationResults.length > 0 && (
                <div className="space-y-6">
                  <div className="border-t pt-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Generation Results</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {generationResults.map((result, index) => (
                        <div key={index} className="card">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-semibold text-gray-900">{result.model_name}</h3>
                              <p className="text-sm text-gray-600">Using: {result.prompt_used}</p>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                              <div>Cost: {result.cost_chf} CHF</div>
                              <div>Latency: {result.latency_ms}ms</div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">User Input:</h4>
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{result.user_input}</p>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">LLM Output:</h4>
                              <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
                                {JSON.stringify(result.raw_json, null, 2)}
                              </pre>
                            </div>

                            {/* Show raw response when parsing failed */}
                            {result.raw_json?.error?.includes('Failed to parse') && result.raw_llm_response && (
                              <div>
                                <h4 className="text-sm font-medium text-orange-700 mb-1">
                                  🔧 Raw LLM Response (for debugging):
                                </h4>
                                <pre className="text-xs bg-orange-50 text-orange-900 p-3 rounded overflow-x-auto border-l-4 border-orange-400 max-h-40 overflow-y-auto">
                                  {result.raw_llm_response}
                                </pre>
                                <div className="text-xs text-orange-600 mt-1">
                                  ⚠️ JSON parsing failed. The raw response above shows exactly what the LLM returned.
                                </div>
                              </div>
                            )}
                            
                            <div className="flex space-x-2 flex-wrap">
                              <button 
                                onClick={() => handleCopyRawJson(result)}
                                className="btn-secondary text-xs"
                              >
                                Copy LLM Output
                              </button>
                              <button 
                                onClick={() => handleCopyRawResponse(result)}
                                className="btn-secondary text-xs bg-orange-100 text-orange-700 hover:bg-orange-200"
                                title="Copy the complete raw LLM response for debugging parsing issues"
                              >
                                Copy Raw Response
                              </button>
                              <button 
                                onClick={() => handleCopyJson(result, result.prompt, result.user_input)}
                                className="btn-primary text-xs"
                              >
                                Copy Complete JSON
                              </button>
                              <button 
                                onClick={() => {
                                  // Download validated raw layers JSON
                                  const { blob, filename } = createDownloadableJson(
                                    result.raw_json, 
                                    `metx-layers-${result.model_name}-${Date.now()}.json`
                                  )
                                  const url = URL.createObjectURL(blob)
                                  const link = document.createElement('a')
                                  link.href = url
                                  link.download = filename
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                  URL.revokeObjectURL(url)
                                }}
                                className="btn-secondary text-xs"
                              >
                                Download Generated Layers
                              </button>
                              <button 
                                onClick={() => handleDownloadJson(result, result.prompt, result.user_input)}
                                className="btn-secondary text-xs"
                              >
                                Download Generated Dashboard
                              </button>
                              <button 
                                onClick={() => handleRateResult(index)}
                                className="btn-secondary text-xs"
                              >
                                {result.manual_rating ? `★ ${result.manual_rating}/5` : 'Rate Result'}
                              </button>
                            </div>
                          </div>

                          {/* Manual Rating */}
                          {result.manual_rating && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Manual Rating</h4>
                              <div className="bg-blue-50 p-3 rounded">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className="flex text-yellow-400">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <span key={star} className={star <= result.manual_rating ? 'text-yellow-400' : 'text-gray-300'}>
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">
                                    {result.manual_rating}/5
                                  </span>
                                </div>
                                {result.manual_comment && (
                                  <p className="text-sm text-gray-600 mt-2">{result.manual_comment}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Automated Evaluation */}
                          {evaluationResults[index] && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <EvaluationDisplay 
                                evaluation={evaluationResults[index]} 
                                className="bg-gray-50"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Batch Evaluation Panel */}
                    {generationResults.length > 0 && (
                      <div className="mt-8">
                        <EvaluationComparisonPanel 
                          results={generationResults}
                          className="border-t border-gray-200 pt-6"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Generations View */}
          {currentView === 'generations' && (
            <GenerationsView />
          )}

          {/* Evaluations View */}
          {currentView === 'evaluations' && (
            <EvaluationPage />
          )}

          {/* Prompts View */}
          {currentView === 'prompts' && (
            <div>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900 mb-2">📝 Prompt Management System</h3>
                <p className="text-blue-700">
                  This is a preview of the prompt library interface. In production, this would connect to Supabase for full CRUD operations with versioning and collaboration features.
                </p>
              </div>
              
              <div className="space-y-4">
                {isLoadingPrompts ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : prompts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No prompts found. Create your first prompt to get started.
                  </div>
                ) : (
                  prompts.map(prompt => (
                  <div key={prompt.id} className={`card ${prompt.is_default ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`} style={{minHeight: '200px', overflow: 'visible'}}>
                                          <div className="flex justify-between items-start" style={{minHeight: '100px'}}>
                        <div className="flex-1" style={{maxWidth: 'calc(100% - 300px)'}}>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">{prompt.name}</h3>
                          {prompt.is_default && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              📌 Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{prompt.description}</p>
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">Template Preview:</p>
                          <div className="bg-gray-50 p-2 rounded text-sm text-gray-700 line-clamp-2">
                            {prompt.template_text}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <span>Version {prompt.version}</span>
                          <span>Uses placeholder: {prompt.use_placeholder ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4 flex-shrink-0" style={{minWidth: '280px'}}>
                        {prompt.is_default ? (
                          <button
                            onClick={() => handleUnsetPromptAsDefault(prompt)}
                            className="px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                            title="Unpin as default"
                          >
                            Unpin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetPromptAsDefault(prompt)}
                            className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                            title="Pin as default"
                          >
                            Pin as Default
                          </button>
                        )}
                        <button
                          onClick={() => handleEditPrompt(prompt)}
                          className="btn-secondary text-sm py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleViewVersionHistory(prompt)}
                          className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                          title="View version history"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>History</span>
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(prompt)}
                          className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  ))
                )}
                <button
                  onClick={handleCreatePrompt}
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                >
                  + Create New Prompt
                </button>
              </div>
            </div>
          )}

          {/* Editor View */}
          {currentView === 'editor' && (
            <div>
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-medium text-green-900 mb-2">✏️ Prompt Editor</h3>
                <p className="text-green-700">
                  Create and edit prompt templates with real-time validation to ensure compatibility.
                </p>
              </div>

              {/* Validation Messages */}
              {(promptValidation.errors.length > 0 || promptValidation.warnings.length > 0) && (
                <div className="mb-6">
                  {promptValidation.errors.length > 0 && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="text-sm font-medium text-red-800 mb-2">❌ Validation Errors</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        {promptValidation.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {promptValidation.warnings.length > 0 && (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Warnings</h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {promptValidation.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="card">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-semibold">
                    {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
                    {editingPrompt && (
                      <span className="ml-2 text-sm text-gray-500 font-normal">
                        v{editingPrompt.current_version || editingPrompt.version}
                      </span>
                    )}
                  </h2>
                  {editingPrompt && (
                    <button
                      onClick={() => handleViewVersionHistory(editingPrompt)}
                      className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      title="View version history"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Version History</span>
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prompt Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={promptForm.name}
                      onChange={(e) => setPromptForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Advanced Aviation Weather"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={promptForm.description}
                      onChange={(e) => setPromptForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this prompt template"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prompt Type <span className="text-red-500">*</span>
                    </label>
                    <select 
                      className="input-field" 
                      value={promptForm.prompt_type}
                      onChange={(e) => setPromptForm(prev => ({ ...prev, prompt_type: e.target.value as 'generation' | 'judge' }))}
                    >
                      <option value="generation">Generation (for creating MetX dashboards)</option>
                      <option value="judge">Judge (for evaluating generated outputs)</option>
                    </select>
                    <p className="text-xs text-gray-600 mt-1">
                      Generation prompts create weather dashboards. Judge prompts evaluate the quality of generated outputs.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Text <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                      className="input-field h-40" 
                      value={promptForm.template_text}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setPromptForm(prev => ({ ...prev, template_text: newValue }))
                        // useEffect will handle validation automatically
                      }}
                      placeholder="Generate a comprehensive weather dashboard for {{user_input}}..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {promptForm.prompt_type === 'generation' 
                        ? "Use {{user_input}} to include the user's weather request. Enable 'Use placeholder' below."
                        : "Use {{user_input}}, {{expected_json}}, and {{generated_json}} placeholders for evaluation prompts."
                      }
                    </p>
                  </div>
                  
                  {promptForm.prompt_type === 'generation' && (
                    <div>
                      <label className="flex items-center space-x-3 mb-4">
                        <input
                          type="checkbox"
                          checked={promptForm.use_placeholder}
                          onChange={(e) => {
                            setPromptForm(prev => ({ ...prev, use_placeholder: e.target.checked }))
                            // useEffect will handle validation automatically
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">
                          Use <code>{'{{user_input}}'}</code> placeholder (replaces user input in template)
                        </span>
                      </label>
                    </div>
                  )}
                  
                  {promptForm.prompt_type === 'generation' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">JSON Prefix</label>
                      <textarea 
                        className="input-field h-20" 
                        value={promptForm.json_prefix}
                        onChange={(e) => {
                          setPromptForm(prev => ({ ...prev, json_prefix: e.target.value }))
                          // useEffect will handle validation automatically
                        }}
                        placeholder='{"id": 12000, "title": "{{DASHBOARD_TITLE}}", "maps": [{"layers": ['
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        JSON structure that comes before the generated layers
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">JSON Suffix</label>
                      <textarea 
                        className="input-field h-20" 
                        value={promptForm.json_suffix}
                        onChange={(e) => {
                          setPromptForm(prev => ({ ...prev, json_suffix: e.target.value }))
                          // useEffect will handle validation automatically
                        }}
                        placeholder=']}]}'
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        JSON structure that comes after the generated layers
                      </p>
                    </div>
                    </div>
                  )}
                  
                  {/* Validation Display */}
                  {(promptValidation.errors.length > 0 || promptValidation.warnings.length > 0) && (
                    <div className="space-y-2">
                      {promptValidation.errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <h4 className="text-sm font-medium text-red-800 mb-1">Validation Errors:</h4>
                          <ul className="text-sm text-red-700 list-disc list-inside">
                            {promptValidation.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {promptValidation.warnings.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <h4 className="text-sm font-medium text-yellow-800 mb-1">Warnings:</h4>
                          <ul className="text-sm text-yellow-700 list-disc list-inside">
                            {promptValidation.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <button onClick={handleCancelEdit} className="btn-secondary">
                      Cancel
                    </button>
                    <button 
                      onClick={handleSavePrompt} 
                      disabled={promptValidation.errors.length > 0 || !promptForm.name.trim()}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      title={promptValidation.errors.length > 0 ? `Validation errors: ${promptValidation.errors.join(', ')}` : (!promptForm.name.trim() ? 'Name is required' : 'Ready to save')}
                    >
                      Save Prompt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Rating Modal */}
      {ratingModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Generation Result</h3>
            
            <div className="space-y-4">
              {/* Star Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating (1-5 stars)</label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatingModal(prev => ({ ...prev, rating: star }))}
                      className={`text-2xl ${
                        star <= ratingModal.rating 
                          ? 'text-yellow-400' 
                          : 'text-gray-300 hover:text-yellow-200'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {ratingModal.rating === 0 && 'Click to rate'}
                  {ratingModal.rating === 1 && 'Poor'}
                  {ratingModal.rating === 2 && 'Fair'}
                  {ratingModal.rating === 3 && 'Good'}
                  {ratingModal.rating === 4 && 'Very Good'}
                  {ratingModal.rating === 5 && 'Excellent'}
                </p>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment (optional)
                </label>
                <textarea
                  value={ratingModal.comment}
                  onChange={(e) => setRatingModal(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="What did you think about this result? Any specific feedback?"
                  className="input-field h-24 resize-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelRating}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRating}
                disabled={ratingModal.rating === 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {versionHistoryModal.isOpen && versionHistoryModal.prompt && (
        <PromptVersionHistory
          prompt={versionHistoryModal.prompt}
          isOpen={versionHistoryModal.isOpen}
          onClose={() => setVersionHistoryModal({ isOpen: false, prompt: null })}
          onRollback={handleVersionRollback}
        />
      )}
    </div>
  )
}

export default App


