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

  const loadBatchRuns = async (expandRunId?: string) => {
    try {
      setLoading(true);
      const runs = await BatchEvaluationService.getAllBatchRuns();
      setBatchRuns(runs);
      
      // Auto-expand the specified run after completion
      if (expandRunId) {
        const completedRun = runs.find(run => run.id === expandRunId);
        if (completedRun) {
          setSelectedRun(completedRun);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evaluation runs');
    } finally {
      setLoading(false);
    }
  };

  const deleteEvaluationRun = async (runId: string) => {
    if (!confirm('Are you sure you want to delete this evaluation run? This action cannot be undone.')) {
      return;
    }

    try {
      await BatchEvaluationService.deleteBatchRun(runId);
      await loadBatchRuns();
      // If the deleted run was selected, clear the selection
      if (selectedRun && selectedRun.id === runId) {
        setSelectedRun(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete evaluation run');
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

  const getAverageScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 8) return 'text-green-600 font-semibold';
    if (score >= 6) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
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
            onClick={() => loadBatchRuns()}
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
              <EvaluationComparisonPanel onEvaluationComplete={(runId?: string) => {
                loadBatchRuns(runId);
                setShowNewEvaluation(false);
              }} />
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
                  {(selectedRun as any).prompts && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Prompt:</span> {(selectedRun as any).prompts.name} 
                      <span className="text-gray-500"> (v{selectedRun.prompt_version})</span>
                    </div>
                  )}
                  {(selectedRun as any).models && (
                    <div className="mt-1 text-sm text-gray-600">
                      <span className="font-medium">Model:</span> {(selectedRun as any).models.name}
                    </div>
                  )}
                  <div className="mt-1 text-sm text-gray-600">
                    <span className="font-medium">Judge Prompt:</span> {
                      (selectedRun as any).judge_prompts?.name || 'Hardcoded Default'
                    }
                    {(selectedRun as any).judge_prompts?.version && (
                      <span className="text-gray-500"> (v{(selectedRun as any).judge_prompts.version})</span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    <span className="font-medium">Judge Model:</span> {
                      (selectedRun as any).judge_models?.name || selectedRun.judge_model_id || 'Default'
                    }
                  </div>
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
                          Success Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Average Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {batchRuns.map((run) => {
                        // Calculate success rate from the actual success data
                        const successCount = run.successful_evaluations || 0;
                        const successRate = run.completed_test_cases > 0 ? Math.round((successCount / run.completed_test_cases) * 100) : 0;
                        
                        return (
                        <tr 
                          key={run.id} 
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td 
                            className="px-6 py-4 whitespace-nowrap cursor-pointer"
                            onClick={() => setSelectedRun(run)}
                          >
                            <div className="text-sm font-medium text-gray-900">
                              {run.name}
                              {(run as any).judge_prompts?.name && (
                                <span className="text-gray-500 ml-2">
                                  • {(run as any).judge_prompts.name}
                                  {(run as any).judge_prompts.version && (
                                    <span className="text-gray-400"> v{(run as any).judge_prompts.version}</span>
                                  )}
                                </span>
                              )}
                              {(run as any).judge_models?.name && (
                                <span className="text-gray-500 ml-2">• {(run as any).judge_models.name}</span>
                              )}
                            </div>
                            {(run as any).prompts && (
                              <div className="text-xs text-gray-400 mt-1">
                                {(run as any).prompts.name} v{run.prompt_version} • {(run as any).models?.name}
                              </div>
                            )}
                          </td>
                          <td 
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer"
                            onClick={() => setSelectedRun(run)}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-sm">{successCount}/{run.completed_test_cases}</span>
                              {run.completed_test_cases > 0 && (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  successRate >= 80 ? 'bg-green-100 text-green-800' :
                                  successRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {successRate}%
                                </span>
                              )}
                            </div>
                          </td>
                          <td 
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer"
                            onClick={() => setSelectedRun(run)}
                          >
                            <span className={`text-sm ${getAverageScoreColor(run.average_score)}`}>
                              {run.average_score ? run.average_score.toFixed(1) : 'N/A'}
                            </span>
                          </td>
                          <td 
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer"
                            onClick={() => setSelectedRun(run)}
                          >
                            {formatDuration(run.started_at, run.completed_at || undefined)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteEvaluationRun(run.id);
                              }}
                              className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              title="Delete evaluation run"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                        );
                      })}
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