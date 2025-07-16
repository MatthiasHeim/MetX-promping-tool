import React from 'react'

interface OverviewPageProps {
  onNavigateToGenerate?: () => void
  onNavigateToPrompts?: () => void
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ 
  onNavigateToGenerate, 
  onNavigateToPrompts 
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-xl p-8 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🚀 MetX Dashboard Generation Tool
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          An AI-powered prompt engineering platform that revolutionizes how weather dashboards are created for MetX customers.
        </p>
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-gray-600">Internal Testing Tool</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span className="text-gray-600">Prompt Optimization</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
            <span className="text-gray-600">Model Comparison</span>
          </div>
        </div>
      </div>

      {/* Problem Statement */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          🎯 The Challenge We're Solving
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-red-600 mb-3">Current Pain Points</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>Customers struggle with complex MetX setup</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>Parameter search is overwhelming for new users</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>Layer-stack configuration requires expertise</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>High support load for initial dashboard creation</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-green-600 mb-3">AI-Powered Solution</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✅</span>
                  <span>Natural language dashboard creation</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✅</span>
                  <span>Screenshot-to-dashboard conversion</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✅</span>
                  <span>Automated JSON configuration generation</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✅</span>
                  <span>Reduced onboarding time and support costs</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Big Picture Vision */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          🌟 The Big Picture: From Testing to Production
        </h2>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Current Phase: Prompt Engineering & Testing</h3>
                <p className="text-gray-600">This tool helps us perfect prompts and compare AI models to find the best approach for dashboard generation.</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Next Phase: Customer-Facing Chatbot</h3>
                <p className="text-gray-600">The optimized prompts will power an intelligent chatbot on the MetX website that customers can use directly.</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Future Vision: Seamless Dashboard Creation</h3>
                <p className="text-gray-600">Customers describe their needs in plain English or upload reference images, and get instant, working dashboards.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tool Features */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          🛠️ Tool Features & Capabilities
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-600 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Multi-Model Testing
            </h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>• Compare GPT-4.1, o3, GPT-4o, and other models</li>
              <li>• Run multiple models simultaneously</li>
              <li>• Track cost and performance metrics</li>
              <li>• Identify best model for each use case</li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-600 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Prompt Management
            </h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>• Version-controlled prompt library</li>
              <li>• Template system with placeholders</li>
              <li>• JSON prefix/suffix wrapping</li>
              <li>• Collaborative editing and rollback</li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-600 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Input Flexibility
            </h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>• Text descriptions in natural language</li>
              <li>• Image uploads for visual references</li>
              <li>• Weather data parameter specifications</li>
              <li>• Geographic region targeting</li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-orange-600 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Quality Assessment
            </h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>• Manual rating system (1-5 stars)</li>
              <li>• Automated evaluation scoring</li>
              <li>• Cost and latency tracking</li>
              <li>• Output comparison and validation</li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-indigo-600 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Automated Evaluation
            </h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>• Batch testing with AI judge models</li>
              <li>• Systematic scoring across test cases</li>
              <li>• Progress tracking and success rates</li>
              <li>• Performance comparison metrics</li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-teal-600 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              JSON Validation
            </h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>• Schema validation for MetX compatibility</li>
              <li>• Parameter completeness checking</li>
              <li>• Structure and format verification</li>
              <li>• Error detection and reporting</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Workflow Guide */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          📋 How to Use This Tool
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Generate Dashboard</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Go to the <strong>Generate</strong> tab. Describe your desired weather dashboard in natural language 
                  or upload a reference image. Select which AI models to test and choose a prompt template.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Compare Results</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Review the generated JSON configurations from different models. Check cost, latency, and quality. 
                  Download the best results and rate their performance.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Refine Prompts</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Use the <strong>Prompts</strong> tab to create new prompt templates or modify existing ones. 
                  Leverage version control to track improvements and rollback if needed.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Track History</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Review all past generations in the <strong>All Generations</strong> tab. Analyze patterns, 
                  successful approaches, and areas for improvement to optimize the prompt strategy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Metrics */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          🎯 Success Metrics & Goals
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Target Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Generation Time</span>
                <span className="font-bold text-green-700">&lt; 60 seconds</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Cost per Generation</span>
                <span className="font-bold text-green-700">≤ 0.10 CHF</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">User Success Rate</span>
                <span className="font-bold text-green-700">≥ 90%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Rating Coverage</span>
                <span className="font-bold text-green-700">≥ 70%</span>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">Business Impact</h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">📈</span>
                <span>Reduce customer onboarding time</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">💡</span>
                <span>Demonstrate AI innovation to investors</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">🛠️</span>
                <span>Lower support team workload</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">🚀</span>
                <span>Enable self-service dashboard creation</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Technical Context */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          ⚙️ Technical Implementation
        </h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Models</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• OpenAI GPT-4o</li>
                <li>• OpenAI o3</li>
                <li>• OpenAI o3-mini</li>
                <li>• Claude Sonnet 4</li>
                <li>• Gemini 2.5 Pro</li>
                <li>• Grok 4</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Tech Stack</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• React + TypeScript</li>
                <li>• Supabase (DB + Auth)</li>
                <li>• Vercel (Hosting)</li>
                <li>• Vitest (Testing)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Data Flow</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• User input → Prompt template</li>
                <li>• Template + input → AI model</li>
                <li>• Raw JSON → Validation & wrapping</li>
                <li>• Final JSON → MetX dashboard</li>
                <li>• Evaluation → Performance metrics</li>
                <li>• Ratings → Model optimization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Start Testing? 🚀</h2>
        <p className="text-blue-100 mb-6">
          Begin by generating your first dashboard or exploring the prompt library to understand how the tool works.
        </p>
        <div className="flex justify-center space-x-4">
          <button 
            onClick={onNavigateToGenerate}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Generate Your First Dashboard
          </button>
          <button 
            onClick={onNavigateToPrompts}
            className="border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:bg-opacity-10 transition-colors"
          >
            Explore Prompts
          </button>
        </div>
      </div>
    </div>
  )
}