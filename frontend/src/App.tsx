import React, { useState } from 'react'
import { LoginForm } from './components/auth/LoginForm'
import { GenerationForm } from './components/generation/GenerationForm'
import { EvaluationDisplay } from './components/evaluation/EvaluationDisplay'
import { EvaluationService } from './services/evaluation/EvaluationService'
import type { Model, Prompt } from './types/database'
import type { EvaluationResult } from './services/evaluation/EvaluationService'
import './App.css'

// Mock data for demonstration
const mockModels: Model[] = [
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', price_per_1k_tokens: 0.06 },
  { id: 'o3', name: 'o3', provider: 'openai', price_per_1k_tokens: 0.15 },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', price_per_1k_tokens: 0.005 }
]

const mockPrompts: Prompt[] = [
  {
    id: 'prompt-1',
    name: 'MetX Default Template',
    description: 'Standard MetX dashboard configuration with weather layers',
    template_text: 'Generate a comprehensive MetX dashboard configuration for: {{output}}. Include appropriate weather layers, time ranges, and visualization settings.',
    json_prefix: '{"metx_dashboard": {"version": "2.0", "config": {',
    json_suffix: '}}}',
    use_placeholder: true,
    version: 1,
    created_by: 'system',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'prompt-2',
    name: 'Aviation Weather Template',
    description: 'Specialized template for aviation weather dashboards',
    template_text: 'Create an aviation-focused MetX dashboard for: {{output}}. Prioritize wind, visibility, precipitation, and turbulence data.',
    json_prefix: '{"aviation_dashboard": {"type": "metx", "focus": "aviation", "data": {',
    json_suffix: '}}}',
    use_placeholder: true,
    version: 1,
    created_by: 'system',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [generationResults, setGenerationResults] = useState<any[]>([])
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([])
  const [currentView, setCurrentView] = useState<'generation' | 'prompts' | 'editor'>('generation')
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)

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

  const handleGenerate = async (data: {
    text: string
    selectedModels: Model[]
    selectedPrompt: Prompt
    inputImage: File | null
  }) => {
    console.log('Generation request:', data)
    
    // Create mock results for each selected model
    const mockResults = data.selectedModels.map(model => {
      const costChf = Math.random() * 0.15 // Random cost between 0-0.15 CHF
      const latencyMs = Math.floor(1000 + Math.random() * 5000) // 1-6 seconds
      
      const generatedJson = {
        metx_dashboard: {
          version: "2.0",
          config: {
            layers: ["temperature", "precipitation", "wind"],
            region: "Switzerland", 
            timeRange: "24h",
            visualization: "heatmap",
            generated_by: model.name,
            timestamp: new Date().toISOString()
          }
        }
      }

      return {
        model_id: model.id,
        model_name: model.name,
        prompt_used: data.selectedPrompt.name,
        user_input: data.text,
        raw_json: {
          layers: ["temperature", "precipitation", "wind"],
          region: "Switzerland",
          timeRange: "24h",
          visualization: "heatmap"
        },
        final_json: generatedJson,
        cost_chf: parseFloat(costChf.toFixed(4)),
        latency_ms: latencyMs,
        success: true
      }
    })
    
    // Generate automatic evaluations for each result
    const evaluations = mockResults.map(result => 
      EvaluationService.generateOverallEvaluation({
        model_id: result.model_id,
        user_input: result.user_input,
        generated_json: result.final_json,
        cost_chf: result.cost_chf,
        latency_ms: result.latency_ms
      })
    )
    
    setGenerationResults(mockResults)
    setEvaluationResults(evaluations)
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
    setCurrentView('editor')
  }

  const handleDeletePrompt = (prompt: Prompt) => {
    console.log('Delete prompt:', prompt)
    // Here we would call the actual delete service
  }

  const handleCreatePrompt = () => {
    setEditingPrompt(null)
    setCurrentView('editor')
  }

  const handleSavePrompt = (prompt: Prompt) => {
    console.log('Save prompt:', prompt)
    setCurrentView('prompts')
    // Here we would refresh the prompt list
  }

  const handleCancelEdit = () => {
    setEditingPrompt(null)
    setCurrentView('prompts')
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
                models={mockModels}
                prompts={mockPrompts}
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
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Generated JSON:</h4>
                              <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
                                {JSON.stringify(result.final_json, null, 2)}
                              </pre>
                            </div>
                            
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => navigator.clipboard.writeText(JSON.stringify(result.final_json, null, 2))}
                                className="btn-primary text-xs"
                              >
                                Copy JSON
                              </button>
                              <button className="btn-secondary text-xs">
                                Download
                              </button>
                              <button className="btn-secondary text-xs">
                                Rate Result
                              </button>
                            </div>
                          </div>

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
                {mockPrompts.map(prompt => (
                  <div key={prompt.id} className="card">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{prompt.name}</h3>
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
                ))}
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
                  This is a preview of the prompt editing interface. In production, this would include real-time validation, template processing, and Supabase integration.
                </p>
              </div>
              <div className="card">
                <h2 className="text-xl font-semibold mb-6">
                  {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prompt Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      defaultValue={editingPrompt?.name || ''}
                      placeholder="e.g., Advanced Aviation Weather"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      defaultValue={editingPrompt?.description || ''}
                      placeholder="Brief description of this prompt template"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Template Text</label>
                    <textarea 
                      className="input-field h-32" 
                      defaultValue={editingPrompt?.template_text || ''}
                      placeholder="Generate a comprehensive weather dashboard for {{location}} showing {{parameters}}..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">JSON Prefix</label>
                      <textarea 
                        className="input-field h-20" 
                        defaultValue={editingPrompt?.json_prefix || ''}
                        placeholder='{"layers": ['
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">JSON Suffix</label>
                      <textarea 
                        className="input-field h-20" 
                        defaultValue={editingPrompt?.json_suffix || ''}
                        placeholder=']}'
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked={editingPrompt?.use_placeholder || false}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">
                        Use {`{{output}}`} placeholder (replaces model output in template)
                      </span>
                    </label>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <button onClick={handleCancelEdit} className="btn-secondary">
                      Cancel
                    </button>
                    <button onClick={() => handleSavePrompt(editingPrompt || mockPrompts[0])} className="btn-primary">
                      Save Prompt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
