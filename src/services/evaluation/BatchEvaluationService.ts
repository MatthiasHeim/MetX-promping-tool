import { supabase } from '../../lib/supabase'
import { UserInputService } from '../inputs/UserInputService'
import { EvaluationTestCaseService } from './EvaluationTestCaseService'
import { PromptService } from '../prompts/PromptService'
import { ModelService } from '../models/ModelService'
import { OpenAIService } from '../generation/OpenAIService'
import type { 
  BatchEvaluationRun, 
  BatchEvaluationRunUpdate,
  BatchEvaluationResult,
  BatchEvaluationResultInsert,
  BatchEvaluationSummary,
  BatchEvaluationStatus,
  StartBatchEvaluationRequest,
  EvaluationTestCase,
  Prompt,
  Model
} from '../../types/database'

export class BatchEvaluationService {
  /**
   * Start a new batch evaluation run
   */
  static async startBatchEvaluation(request: StartBatchEvaluationRequest, userId: string): Promise<BatchEvaluationRun> {
    try {
      // Fetch test cases to run
      const testCases = request.test_case_ids?.length
        ? await this.getTestCasesByIds(request.test_case_ids)
        : await EvaluationTestCaseService.fetchTestCases()

      if (testCases.length === 0) {
        throw new Error('No active test cases found to evaluate')
      }

      // Create the batch run record
      const { data: batchRun, error } = await supabase
        .from('batch_evaluation_runs')
        .insert([{
          name: request.name,
          prompt_id: request.prompt_id,
          model_id: request.model_id,
          judge_prompt_id: request.judge_prompt_id || null,
          judge_model_id: request.judge_model_id || null,
          total_test_cases: testCases.length,
          completed_test_cases: 0,
          status: 'pending',
          started_by: userId,
          started_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating batch evaluation run:', error)
        throw new Error(`Failed to create batch evaluation run: ${error.message}`)
      }

      // Start the evaluation process asynchronously
      this.runBatchEvaluation(
        batchRun.id, 
        testCases, 
        request.prompt_id, 
        request.model_id, 
        request.judge_prompt_id, 
        request.judge_model_id, 
        userId
      ).catch(error => {
        console.error('Error in batch evaluation:', error)
        this.markBatchRunFailed(batchRun.id, error.message)
      })

      return batchRun
    } catch (error) {
      console.error('Error in startBatchEvaluation:', error)
      throw error
    }
  }

  /**
   * Run the actual batch evaluation process
   */
  private static async runBatchEvaluation(
    batchRunId: string,
    testCases: EvaluationTestCase[],
    promptId: string,
    modelId: string,
    judgePromptId: string | undefined,
    judgeModelId: string | undefined,
    userId: string
  ): Promise<void> {
    try {
      // Update status to running
      await this.updateBatchRun(batchRunId, { status: 'running' })

      // Fetch prompt and model details
      const [prompt, model] = await Promise.all([
        PromptService.fetchPromptById(promptId),
        ModelService.fetchModelById(modelId)
      ])

      if (!prompt || !model) {
        throw new Error('Prompt or model not found')
      }

      const results: BatchEvaluationResult[] = []
      let totalScore = 0
      let completedCount = 0

      // Process each test case
      for (const testCase of testCases) {
        try {
          // Generate result for this test case
          const generationResult = await this.generateResultForTestCase(
            testCase,
            prompt,
            model,
            userId
          )

          // Compare with expected JSON using judge model
          const comparisonResult = await this.compareWithExpectedJson(
            generationResult.final_json,
            testCase.expected_json,
            testCase.user_prompt,
            judgePromptId,
            judgeModelId
          )

          // Store the batch evaluation result
          const batchResult = await this.createBatchEvaluationResult({
            batch_run_id: batchRunId,
            test_case_id: testCase.id,
            generation_result_id: generationResult.id,
            comparison_score: comparisonResult.score,
            comparison_details: comparisonResult.details,
            judge_model_id: judgeModelId || 'claude-4-sonnet' // Use configured or default judge model
          })

          results.push(batchResult)
          totalScore += comparisonResult.score
          completedCount++

          // Update progress
          const averageScore = totalScore / completedCount
          await this.updateBatchRun(batchRunId, {
            completed_test_cases: completedCount,
            average_score: averageScore
          })

        } catch (error) {
          console.error(`Error processing test case ${testCase.id}:`, error)
          // Continue with next test case but log the error
          await this.createBatchEvaluationResult({
            batch_run_id: batchRunId,
            test_case_id: testCase.id,
            generation_result_id: null,
            comparison_score: 0,
            comparison_details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            judge_model_id: null
          })
          completedCount++
        }
      }

      // Mark as completed
      const finalAverageScore = results.length > 0 ? totalScore / results.length : 0
      await this.updateBatchRun(batchRunId, {
        status: 'completed',
        completed_test_cases: completedCount,
        average_score: finalAverageScore,
        completed_at: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error in runBatchEvaluation:', error)
      await this.markBatchRunFailed(batchRunId, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Generate a result for a specific test case
   */
  private static async generateResultForTestCase(
    testCase: EvaluationTestCase,
    _prompt: Prompt,
    _model: Model,
    userId: string
  ): Promise<any> {
    // Create user input (for future use)
    await UserInputService.createUserInput(
      userId,
      testCase.user_prompt
    )

    // For now, create a simple generation result simulation
    // In a real implementation, this would use the proper generation pipeline
    const mockResult = {
      id: 'mock-result-id',
      final_json: {
        layers: [
          {
            kind: "BackgroundMapDescription",
            style: "topographique",
            opacity: 1,
            show: true
          }
        ]
      }
    }

    return mockResult
  }

  /**
   * Compare generated JSON with expected JSON using a judge model
   */
  private static async compareWithExpectedJson(
    generatedJson: any,
    expectedJson: any,
    userPrompt: string,
    judgePromptId?: string,
    judgeModelId?: string
  ): Promise<{ score: number; details: string }> {
    try {
      let judgePromptText: string
      let judgeModel: Model

      // Get judge prompt template
      if (judgePromptId) {
        const prompt = await PromptService.fetchPromptById(judgePromptId)
        if (!prompt) {
          throw new Error(`Judge prompt with ID ${judgePromptId} not found`)
        }
        judgePromptText = prompt.template_text
      } else {
        // Default judge prompt
        judgePromptText = `
You are an expert evaluator comparing AI-generated MetX weather dashboard configurations.

USER REQUEST: "{{user_input}}"

EXPECTED JSON (Reference):
{{expected_json}}

GENERATED JSON (To Evaluate):
{{generated_json}}

Please evaluate how well the generated JSON matches the expected JSON for this user request. Consider:

1. **Weather Layers**: Are the correct weather parameters included?
2. **Geographic Coverage**: Does it cover the right region/area?
3. **Layer Configuration**: Are layers properly configured with correct parameters?
4. **Structure**: Is the JSON structure valid and complete?
5. **Additional Value**: Does it include useful additional layers beyond the minimum?

Provide:
1. A similarity score from 1-10 (10 = perfect match, 1 = completely different)  
2. A brief explanation of differences and why you gave this score

Respond in this exact format:
SCORE: [number]
DETAILS: [explanation]
`
      }

      // Get judge model
      if (judgeModelId) {
        const model = await ModelService.fetchModelById(judgeModelId)
        if (!model) {
          throw new Error(`Judge model with ID ${judgeModelId} not found`)
        }
        judgeModel = model
      } else {
        // Default judge model
        judgeModel = {
          id: 'claude-4-sonnet',
          name: 'Claude 4 Sonnet',
          provider: 'anthropic',
          price_per_1k_tokens: 0.015,
          is_pinned: false
        }
      }

      // Process the judge prompt template with actual values
      const processedPrompt = judgePromptText
        .replace(/\{\{user_input\}\}/g, userPrompt)
        .replace(/\{\{expected_json\}\}/g, JSON.stringify(expectedJson, null, 2))
        .replace(/\{\{generated_json\}\}/g, JSON.stringify(generatedJson, null, 2))

      const response = await OpenAIService.generateCompletion(
        processedPrompt,
        judgeModel
      )

      // Parse the response
      const responseText = response.content || ''
      const scoreMatch = responseText.match(/SCORE:\s*(\d+)/)
      const detailsMatch = responseText.match(/DETAILS:\s*(.+)/s)

      const score = scoreMatch ? parseInt(scoreMatch[1]) : 5 // Default to middle score if parsing fails
      const details = detailsMatch ? detailsMatch[1].trim() : responseText

      return { score, details }

    } catch (error) {
      console.error('Error in judge model comparison:', error)
      return {
        score: 0,
        details: `Judge model error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Create a batch evaluation result record
   */
  private static async createBatchEvaluationResult(
    result: BatchEvaluationResultInsert
  ): Promise<BatchEvaluationResult> {
    const { data, error } = await supabase
      .from('batch_evaluation_results')
      .insert([result])
      .select()
      .single()

    if (error) {
      console.error('Error creating batch evaluation result:', error)
      throw new Error(`Failed to create batch evaluation result: ${error.message}`)
    }

    return data
  }

  /**
   * Update a batch run record
   */
  private static async updateBatchRun(
    id: string,
    updates: BatchEvaluationRunUpdate
  ): Promise<void> {
    const { error } = await supabase
      .from('batch_evaluation_runs')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Error updating batch run:', error)
      throw new Error(`Failed to update batch run: ${error.message}`)
    }
  }

  /**
   * Mark a batch run as failed
   */
  private static async markBatchRunFailed(id: string, _errorMessage: string): Promise<void> {
    await this.updateBatchRun(id, {
      status: 'failed',
      completed_at: new Date().toISOString()
    })
  }

  /**
   * Get test cases by IDs
   */
  private static async getTestCasesByIds(ids: string[]): Promise<EvaluationTestCase[]> {
    const { data, error } = await supabase
      .from('evaluation_test_cases')
      .select('*')
      .in('id', ids)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching test cases by IDs:', error)
      throw new Error(`Failed to fetch test cases: ${error.message}`)
    }

    return data || []
  }

  /**
   * Fetch a batch evaluation run with full details
   */
  static async getBatchEvaluationSummary(runId: string): Promise<BatchEvaluationSummary | null> {
    try {
      // Fetch the batch run
      const { data: run, error: runError } = await supabase
        .from('batch_evaluation_runs')
        .select(`
          *,
          prompts!batch_evaluation_runs_prompt_id_fkey(name),
          models!batch_evaluation_runs_model_id_fkey(name)
        `)
        .eq('id', runId)
        .single()

      if (runError) {
        if (runError.code === 'PGRST116') return null
        throw new Error(`Failed to fetch batch run: ${runError.message}`)
      }

      // Fetch all results for this run
      const { data: results, error: resultsError } = await supabase
        .from('batch_evaluation_results')
        .select(`
          *,
          evaluation_test_cases(name, user_prompt)
        `)
        .eq('batch_run_id', runId)
        .order('created_at', { ascending: true })

      if (resultsError) {
        throw new Error(`Failed to fetch batch results: ${resultsError.message}`)
      }

      const duration = run.completed_at 
        ? new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()
        : undefined

      return {
        run_id: run.id,
        prompt_name: run.prompts?.name || 'Unknown Prompt',
        model_name: run.models?.name || 'Unknown Model',
        total_test_cases: run.total_test_cases,
        completed_test_cases: run.completed_test_cases,
        average_score: run.average_score,
        status: run.status as BatchEvaluationStatus,
        started_at: run.started_at,
        completed_at: run.completed_at,
        duration_ms: duration,
        results: results || []
      }

    } catch (error) {
      console.error('Error in getBatchEvaluationSummary:', error)
      throw error
    }
  }

  /**
   * Get all batch evaluation runs
   */
  static async getAllBatchRuns(): Promise<BatchEvaluationRun[]> {
    try {
      const { data, error } = await supabase
        .from('batch_evaluation_runs')
        .select(`
          *,
          prompts!batch_evaluation_runs_prompt_id_fkey(name),
          models!batch_evaluation_runs_model_id_fkey(name)
        `)
        .order('started_at', { ascending: false })

      if (error) {
        console.error('Error fetching batch runs:', error)
        throw new Error(`Failed to fetch batch runs: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in getAllBatchRuns:', error)
      throw error
    }
  }

  /**
   * Cancel a running batch evaluation
   */
  static async cancelBatchRun(runId: string): Promise<void> {
    try {
      await this.updateBatchRun(runId, {
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error in cancelBatchRun:', error)
      throw error
    }
  }
}