import { useState, useEffect } from 'react'
import { TestCaseImportService } from '../../services/evaluation/TestCaseImportService'
import { EvaluationTestCaseService } from '../../services/evaluation/EvaluationTestCaseService'
import type { EvaluationTestCase } from '../../types/database'

interface TestCaseManagerProps {
  className?: string
}

export function TestCaseManager({ className = '' }: TestCaseManagerProps) {
  const [testCases, setTestCases] = useState<EvaluationTestCase[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load test cases on mount
  useEffect(() => {
    loadTestCases()
  }, [])

  const loadTestCases = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const cases = await EvaluationTestCaseService.fetchTestCases()
      setTestCases(cases)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test cases')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportTestCases = async () => {
    setIsImporting(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      // Test cases are already imported in the database via Supabase MCP
      // This is just a placeholder for future import functionality
      setSuccessMessage('Test cases are already available in the database!')
      await loadTestCases() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test cases')
    } finally {
      setIsImporting(false)
    }
  }

  const handleClearTestCases = async () => {
    if (!window.confirm('Are you sure you want to delete ALL test cases? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      await TestCaseImportService.clearAllTestCases()
      setSuccessMessage('All test cases have been cleared')
      await loadTestCases() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear test cases')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTestCase = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this test case?')) {
      return
    }

    try {
      await EvaluationTestCaseService.deleteTestCase(id)
      setSuccessMessage('Test case deleted successfully')
      await loadTestCases() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete test case')
    }
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Test Case Management</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage evaluation test cases for batch evaluation runs
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleImportTestCases}
            disabled={isImporting}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Loading...' : 'Refresh Test Cases'}
          </button>
          
          {testCases.length > 0 && (
            <button
              onClick={handleClearTestCases}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">{successMessage}</div>
            </div>
          </div>
        </div>
      )}

      {/* Test Cases List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-md font-semibold text-gray-900">
            Current Test Cases ({testCases.length})
          </h4>
          {testCases.length > 0 && (
            <button
              onClick={loadTestCases}
              disabled={isLoading}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              Refresh
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : testCases.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Test Cases</h3>
            <p className="text-gray-600 text-sm mb-4">
              Load test cases from the database to start running batch evaluations.
            </p>
            <button
              onClick={handleImportTestCases}
              disabled={isImporting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isImporting ? 'Loading...' : 'Load Test Cases'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {testCases.map((testCase) => (
              <div key={testCase.id} className="flex justify-between items-start p-4 bg-gray-50 rounded-md">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h5 className="text-sm font-medium text-gray-900">{testCase.name}</h5>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      testCase.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {testCase.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {testCase.description && (
                    <p className="text-sm text-gray-600 mb-2">{testCase.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-2">
                    <span className="font-medium">Prompt:</span> "{testCase.user_prompt}"
                  </p>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(testCase.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleDeleteTestCase(testCase.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Case Information */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Available Test Cases</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <strong>Basic Test Cases:</strong> 5 simple prompts (temperature, rain, wind, clouds, UV)</p>
          <p>• <strong>Professional Test Cases:</strong> 4 complex meteorological setups</p>
          <p>• <strong>Total:</strong> 9 comprehensive test cases covering various weather scenarios</p>
          <p>• <strong>Coverage:</strong> Basic user requests + Professional meteorologist workflows</p>
          <p>• <strong>Status:</strong> Test cases are pre-loaded from dashboard JSON analysis</p>
        </div>
      </div>
    </div>
  )
}