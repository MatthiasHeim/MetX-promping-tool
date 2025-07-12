import React, { useState, useEffect } from 'react';
import { BatchEvaluationService } from '../services/evaluation/BatchEvaluationService';
import type { BatchEvaluationRun } from '../types/database';
import { EvaluationComparisonPanel } from '../components/evaluation/EvaluationComparisonPanel';

export const EvaluationPage: React.FC = () => {
  const [batchRuns, setBatchRuns] = useState<BatchEvaluationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<BatchEvaluationRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewEvaluation, setShowNewEvaluation] = useState(false);

  useEffect(() => {
    loadBatchRuns();
  }, []);

  const loadBatchRuns = async () => {
    try {
      setLoading(true);
      const runs = await BatchEvaluationService.getAllBatchRuns();
      setBatchRuns(runs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evaluation runs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'running':
        return 'text-blue-600 bg-blue-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading evaluation runs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={loadBatchRuns}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Evaluation Runs</h1>
              <p className="mt-2 text-gray-600">
                Manage and review batch evaluation results
              </p>
            </div>
            <button
              onClick={() => setShowNewEvaluation(!showNewEvaluation)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showNewEvaluation ? 'Hide New Evaluation' : 'New Evaluation'}
            </button>
          </div>
        </div>

        {showNewEvaluation && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Create New Evaluation</h2>
              <EvaluationComparisonPanel onEvaluationComplete={loadBatchRuns} />
            </div>
          </div>
        )}

        {selectedRun ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{selectedRun.name}</h2>
                  <p className="text-gray-600 mt-1">
                    Run ID: {selectedRun.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRun(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ← Back to List
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Status</span>
                  <div className={`mt-1 px-2 py-1 rounded text-sm font-medium ${getStatusColor(selectedRun.status)}`}>
                    {selectedRun.status}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Started</span>
                  <p className="mt-1 text-sm">{formatDate(selectedRun.started_at)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Duration</span>
                  <p className="mt-1 text-sm">{formatDuration(selectedRun.started_at, selectedRun.completed_at || undefined)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Progress</span>
                  <p className="mt-1 text-sm">{selectedRun.completed_test_cases}/{selectedRun.total_test_cases}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <EvaluationComparisonPanel selectedRunId={selectedRun.id} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Previous Evaluation Runs</h2>
              {batchRuns.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📊</div>
                  <p className="text-gray-600">No evaluation runs found</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Create your first evaluation run to get started
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Average Score
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {batchRuns.map((run) => (
                        <tr key={run.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{run.name}</div>
                            <div className="text-sm text-gray-500">ID: {run.id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(run.status)}`}>
                              {run.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <div className="text-sm">
                                {run.completed_test_cases}/{run.total_test_cases}
                              </div>
                              <div className="ml-2 flex-1 bg-gray-200 rounded-full h-2 max-w-20">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{
                                    width: `${(run.completed_test_cases / Math.max(run.total_test_cases, 1)) * 100}%`
                                  }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(run.started_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDuration(run.started_at, run.completed_at || undefined)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {run.average_score ? run.average_score.toFixed(1) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => setSelectedRun(run)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};