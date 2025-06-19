import React, { useState, useEffect } from 'react'
import { LoginForm } from './components/auth/LoginForm'
import { GenerationForm } from './components/generation/GenerationForm'
import { EvaluationDisplay } from './components/evaluation/EvaluationDisplay'
import { AuthService } from './services/auth/AuthService'
import { EvaluationService } from './services/evaluation/EvaluationService'
import { GenerationService } from './services/generation/GenerationService'
import { GenerationResultService } from './services/generation/GenerationResultService'
import { UserInputService } from './services/inputs/UserInputService'
import { PromptService } from './services/prompts/PromptService'
import { ModelService } from './services/models/ModelService'
import type { Model, Prompt } from './types/database'
import type { EvaluationResult } from './services/evaluation/EvaluationService'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Skip login for development
  const [generationResults, setGenerationResults] = useState<any[]>([])
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([])
  const [currentView, setCurrentView] = useState<'generation' | 'prompts' | 'editor'>('generation')
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
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [promptValidation, setPromptValidation] = useState<{
    errors: string[]
    warnings: string[]
  }>({ errors: [], warnings: [] })
  const [isInitializingForm, setIsInitializingForm] = useState(false)

  // Form state for prompt editor
  const [promptForm, setPromptForm] = useState({
    name: '',
    description: '',
    template_text: '',
    json_prefix: '',
    json_suffix: '',
    use_placeholder: false
  })

  // Load prompts and models when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadPrompts()
      loadModels()
    }
  }, [isAuthenticated])

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
    setIsLoadingModels(true)
    try {
      const fetchedModels = await ModelService.fetchModels()
      setModels(fetchedModels)
    } catch (error) {
      console.error('Error loading models:', error)
      // Keep empty array if there's an error
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleLogin = async (email: string, password: string) => {
    // Simulate authentication
    console.log('Login attempt:', { email, password })
    
    // For demo purposes, accept any email/password
    if (email && password) {
      setIsAuthenticated(true)
      return { success: true }
    }
    
    return { success: false, error: 'Please enter both email and password' }
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
        .split('\n')
        .map(line => line ? '            ' + line : line) // Add indentation to match prefix structure
        .join('\n')
    }
    
    const result = prefix + formattedOutput + suffix
    
    // Test if the result is valid JSON
    try {
      JSON.parse(result)
      return result
    } catch (error) {
      console.warn('Constructed JSON is invalid, falling back to raw output:', error)
      console.log('Invalid JSON preview:', result.substring(0, 200) + '...')
      // Return the raw output as a valid JSON fallback
      return JSON.stringify({
        layers: Array.isArray(rawOutput) ? rawOutput : [rawOutput],
        note: 'Prefix/suffix combination failed, returning raw layers',
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

  const handleCopyJson = async (result: any, prompt: Prompt, userInput?: string) => {
    try {
      const completeJson = constructCompleteJson(result.raw_json, prompt, userInput)
      await navigator.clipboard.writeText(completeJson)
      console.log('Complete JSON copied to clipboard')
    } catch (error) {
      console.error('Failed to copy JSON:', error)
    }
  }

  // Helper function to download JSON
  const handleDownloadJson = (result: any, prompt: Prompt, userInput?: string) => {
    try {
      const completeJson = constructCompleteJson(result.raw_json, prompt, userInput)
      const blob = new Blob([completeJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `metx-dashboard-${result.model_name}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      console.log('JSON downloaded')
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
      // Use a fixed demo user ID that exists in auth.users for development
      // In production, this should use: await AuthService.getCurrentUser()
      const userId = '550e8400-e29b-41d4-a716-446655440000'
      
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
      
      // Upload image if provided (for OpenAI API)
      let imageUrl: string | undefined
      if (data.inputImage) {
        // For now, we'll create a temporary URL - in production this would upload to storage
        imageUrl = URL.createObjectURL(data.inputImage)
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
        
        if (result.success && result.content) {
          try {
            // The LLM should return JSON - try to parse it first
            let contentToParse = result.content.trim()
            
            // Debug logging to understand the content format
            console.log('Parsing content preview:', contentToParse.substring(0, 100) + '...')
            console.log('Content starts with {:', contentToParse.startsWith('{'))
            console.log('Content includes },:', contentToParse.includes('},'))
            console.log('Content starts with [:', contentToParse.startsWith('['))
            
            // Check if content looks like comma-separated JSON objects (not wrapped in array)
            // This handles cases where models return {obj1},{obj2},{obj3} instead of [{obj1},{obj2},{obj3}]
            if (contentToParse.startsWith('{') && contentToParse.includes('},') && !contentToParse.startsWith('[')) {
              console.log('Detected comma-separated JSON objects, wrapping in array')
              contentToParse = '[' + contentToParse + ']'
            }
            
            rawLlmOutput = JSON.parse(contentToParse)
            
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
              final_json = JSON.parse(completeJsonString)
            } catch (jsonError) {
              console.error('Failed to parse complete JSON string:', jsonError)
              console.log('Complete JSON string that failed:', completeJsonString.substring(0, 500) + '...')
              // Fallback: use the raw layers content as final_json
              final_json = {
                layers: layersContent,
                error: 'JSON prefix/suffix combination failed, using raw layers'
              }
            }
            
          } catch (error) {
            console.error('Error parsing LLM response:', error)
            console.log('Raw LLM content:', result.content)
            
            // Try to parse the content as raw layer JSON (without wrapping object)
            try {
              // The content might be a raw layer object or array - try to parse it directly
              let fallbackContentToParse = result.content.trim()
              
              // Check if content looks like comma-separated JSON objects (not wrapped in array)
              // This handles cases where models return {obj1},{obj2},{obj3} instead of [{obj1},{obj2},{obj3}]
              if (fallbackContentToParse.startsWith('{') && fallbackContentToParse.includes('},') && !fallbackContentToParse.startsWith('[')) {
                console.log('Detected comma-separated JSON objects in fallback, wrapping in array')
                fallbackContentToParse = '[' + fallbackContentToParse + ']'
              }
              
              const possibleLayer = JSON.parse(fallbackContentToParse)
              let layersArray: any[]
              
              if (Array.isArray(possibleLayer)) {
                layersArray = possibleLayer
              } else if (possibleLayer && typeof possibleLayer === 'object') {
                // Check if it's the invalid structure with layer1_object, layer2_object, etc.
                const keys = Object.keys(possibleLayer)
                if (keys.some(key => key.includes('layer') && key.includes('object'))) {
                  // Convert invalid structure to proper array
                  layersArray = keys
                    .filter(key => key.includes('layer') && key.includes('object'))
                    .sort() // Sort to maintain order (layer1_object, layer2_object, etc.)
                    .map(key => possibleLayer[key])
                  console.log('Converted invalid layer structure to array (fallback):', layersArray)
                } else {
                  layersArray = [possibleLayer]
                }
              } else {
                throw new Error('Could not parse as layer structure')
              }
              
              rawLlmOutput = layersArray
              const completeJsonString = constructCompleteJson(layersArray, data.selectedPrompt, data.text)
              try {
                final_json = JSON.parse(completeJsonString)
              } catch (jsonError) {
                console.error('Failed to parse complete JSON string (fallback):', jsonError)
                console.log('Complete JSON string that failed (fallback):', completeJsonString.substring(0, 500) + '...')
                // Final fallback: use the raw layers array as final_json
                final_json = {
                  layers: layersArray,
                  error: 'JSON prefix/suffix combination failed, using raw layers'
                }
              }
              
            } catch (innerError) {
              console.error('Failed to parse as layer structure:', innerError)
              // Last resort fallback
              rawLlmOutput = { content: result.content, error: 'Failed to parse as valid JSON' }
              final_json = rawLlmOutput
            }
          }
        } else {
          // Handle error case
          rawLlmOutput = { error: result.error?.message || 'Generation failed' }
          final_json = rawLlmOutput
        }
        
        return {
          user_input_id: userInput.id,
          prompt_id: data.selectedPrompt.id,
          model_id: result.model_id,
          user_id: userId,
          raw_json: rawLlmOutput,
          final_json: final_json,
          cost_chf: result.cost_chf,
          latency_ms: result.latency_ms
        }
      })
      
      // Step 3: Save generation results to database
      const savedResults = await GenerationResultService.createGenerationResults(generationResultsForDB)
      console.log('Saved generation results to database:', savedResults)
      
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
      
      // Generate automatic evaluations for successful results
      const evaluations = results
        .filter((result: any) => result.success)
        .map((result: any) => 
          EvaluationService.generateOverallEvaluation({
            model_id: result.model_id,
            user_input: result.user_input,
            generated_json: result.final_json,
            cost_chf: result.cost_chf,
            latency_ms: result.latency_ms
          })
        )
      
      setGenerationResults(results)
      setEvaluationResults(evaluations)
      
      // Clean up image URL if created
      if (imageUrl && data.inputImage) {
        URL.revokeObjectURL(imageUrl)
      }
      
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

  const handleLogout = () => {
    setIsAuthenticated(false)
    setGenerationResults([])
    setEvaluationResults([])
    setCurrentView('generation')
    setEditingPrompt(null)
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
      setPromptValidation(prev => ({
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
          json_prefix: promptForm.json_prefix || undefined,
          json_suffix: promptForm.json_suffix || undefined,
          use_placeholder: promptForm.use_placeholder
        })
      } else {
        // Create new prompt
        await PromptService.createPrompt({
          name: promptForm.name,
          description: promptForm.description || undefined,
          template_text: promptForm.template_text,
          json_prefix: promptForm.json_prefix || undefined,
          json_suffix: promptForm.json_suffix || undefined,
          use_placeholder: promptForm.use_placeholder
        })
      }
      
      // Refresh the prompt list
      await loadPrompts()
      setCurrentView('prompts')
    } catch (error) {
      console.error('Error saving prompt:', error)
      setPromptValidation(prev => ({
        ...prev,
        errors: [...prev.errors, 'Failed to save prompt: ' + (error as Error).message]
      }))
    }
  }

  const handleCancelEdit = () => {
    setEditingPrompt(null)
    setCurrentView('prompts')
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
  const validatePromptTemplate = (templateText: string, usePlaceholder: boolean): { errors: string[], warnings: string[] } => {
    const errors: string[] = []
    const warnings: string[] = []
    
    const trimmedText = templateText?.trim() || ''
    
    if (!trimmedText || trimmedText.length === 0) {
      errors.push('Template text is required')
      return { errors, warnings }
    }
    
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
        use_placeholder: prompt.use_placeholder || false
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
        use_placeholder: false
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
    
    const templateValidation = validatePromptTemplate(promptForm.template_text, promptForm.use_placeholder)
    const jsonValidation = validateJsonStructure(promptForm.json_prefix, promptForm.json_suffix)
    
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">MetX Prompting Tool</h1>
            <p className="text-gray-600">AI-powered dashboard generation for Meteomatics</p>
          </div>
                     <LoginForm 
             onSubmit={async (data) => {
               const result = await handleLogin(data.email, data.password)
               if (!result.success) {
                 throw new Error(result.error)
               }
             }}
             onSwitchToSignUp={() => console.log('Sign up clicked')}
             isLoading={false}
             error={null}
           />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">MetX Prompting Tool</h1>
                <p className="text-sm text-gray-600">Generate dashboard configurations with AI</p>
              </div>
              <nav className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentView('generation')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'generation' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Generate
                </button>
                <button
                  onClick={() => setCurrentView('prompts')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'prompts' || currentView === 'editor'
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Prompts
                </button>
              </nav>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
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
                            
                            <div className="flex space-x-2 flex-wrap">
                              <button 
                                onClick={() => handleCopyRawJson(result)}
                                className="btn-secondary text-xs"
                              >
                                Copy LLM Output
                              </button>
                              <button 
                                onClick={() => handleCopyJson(result, result.prompt, result.user_input)}
                                className="btn-primary text-xs"
                              >
                                Copy Complete JSON
                              </button>
                              <button 
                                onClick={() => handleDownloadJson(result, result.prompt, result.user_input)}
                                className="btn-secondary text-xs"
                              >
                                Download Complete JSON
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
                  </div>
                </div>
              )}
            </>
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
                  <div key={prompt.id} className={`card ${prompt.is_default ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
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
                      <div className="flex space-x-2 ml-4">
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
                <h2 className="text-xl font-semibold mb-6">
                  {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
                </h2>
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
                                              Use <code>{'{{user_input}}'}</code> to include the user's weather request. Enable "Use placeholder" below.
                    </p>
                  </div>
                  
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
    </div>
  )
}

export default App


