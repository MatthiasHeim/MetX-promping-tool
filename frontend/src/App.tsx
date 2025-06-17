import React, { useState } from 'react'
import { LoginForm } from './components/auth/LoginForm'
import { GenerationForm } from './components/generation/GenerationForm'
import type { Model, Prompt } from './types/database'
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
    const mockResults = data.selectedModels.map(model => ({
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
      final_json: {
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
      },
      cost_chf: (Math.random() * 0.1).toFixed(4),
      latency_ms: Math.floor(1000 + Math.random() * 3000),
      success: true
    }))
    
    setGenerationResults(mockResults)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setGenerationResults([])
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MetX Prompting Tool</h1>
              <p className="text-sm text-gray-600">Generate dashboard configurations with AI</p>
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
          {/* Generation Form */}
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
                    </div>
                  ))}
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
