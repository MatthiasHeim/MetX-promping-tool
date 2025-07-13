import { supabase } from '../../lib/supabase'
import { EvaluationTestCaseService } from './EvaluationTestCaseService'
import { PromptService } from '../prompts/PromptService'
import { ModelService } from '../models/ModelService'
import { OpenAIService } from '../generation/OpenAIService'
import { OpenRouterService } from '../generation/OpenRouterService'
import { GenerationService } from '../generation/GenerationService'
import { parseLLMJsonResponse } from '../../utils/jsonParsing'
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

      // Fetch the current prompt to get its version
      const prompt = await PromptService.fetchPromptById(request.prompt_id)
      if (!prompt) {
        throw new Error('Prompt not found')
      }

      // Create the batch run record
      const { data: batchRun, error } = await supabase
        .from('batch_evaluation_runs')
        .insert([{
          name: request.name,
          prompt_id: request.prompt_id,
          prompt_version: prompt.version,
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
        request.judge_model_id
      ).catch(error => {
        console.error('Error in batch evaluation:', error)
        this.markBatchRunFailed(batchRun.id)
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
    judgeModelId: string | undefined
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
            model
          )

          // Compare with expected JSON using judge model
          const comparisonResult = await this.compareWithExpectedJson(
            generationResult.generated_json,
            testCase.expected_json,
            testCase.user_prompt,
            judgePromptId,
            judgeModelId
          )

          // Store the batch evaluation result
          const batchResult = await this.createBatchEvaluationResult({
            batch_run_id: batchRunId,
            test_case_id: testCase.id,
            generation_result_id: null, // No actual generation result for test evaluations
            comparison_score: comparisonResult.score,
            comparison_details: comparisonResult.details,
            judge_model_id: judgeModelId || 'google/gemini-2.5-flash', // Use configured or default judge model
            generated_json: generationResult.generated_json,
            raw_llm_response: generationResult.raw_content || null // Store raw LLM response for debugging
          })

          results.push(batchResult)
          
          // Only include valid scores (> 0) in average calculation
          if (comparisonResult.score > 0) {
            totalScore += comparisonResult.score
          }
          completedCount++

          // Calculate average only from valid scores
          const validScores = results.filter(r => r.comparison_score !== null && r.comparison_score > 0).length
          const averageScore = validScores > 0 ? totalScore / validScores : null
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
            judge_model_id: null,
            generated_json: null,
            raw_llm_response: null
          })
          completedCount++
        }
      }

      // Mark as completed - calculate average only from valid scores
      const validResults = results.filter(r => r.comparison_score !== null && r.comparison_score > 0)
      const finalAverageScore = validResults.length > 0 ? totalScore / validResults.length : null
      await this.updateBatchRun(batchRunId, {
        status: 'completed',
        completed_test_cases: completedCount,
        average_score: finalAverageScore,
        completed_at: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error in runBatchEvaluation:', error)
      await this.markBatchRunFailed(batchRunId)
    }
  }

  /**
   * Generate a result for a specific test case
   */
  private static async generateResultForTestCase(
    testCase: EvaluationTestCase,
    prompt: Prompt,
    model: Model
  ): Promise<any> {
    try {
      // Process the prompt template with the test case user prompt
      const processedPrompt = GenerationService.processPromptTemplate(prompt.template_text, testCase.user_prompt)
      
      // Generate using the appropriate service based on model provider
      let response;
      if (model.provider === 'openrouter') {
        response = await OpenRouterService.generateCompletion(processedPrompt, model)
      } else {
        response = await OpenAIService.generateCompletion(processedPrompt, model)
      }

      if (!response.success || !response.content) {
        throw new Error(`Generation failed: ${response.error?.message || 'No content generated'}`)
      }

      // Parse the JSON from the response using the shared utility for consistency with regular generation
      const parseResult = parseLLMJsonResponse(response.content)
      
      // Check if parsing was successful before using the result
      if (!parseResult.success) {
        throw new Error(`JSON parsing failed: ${parseResult.error || 'Unknown parsing error'}`)
      }
      
      const generatedJson = parseResult.data

      return {
        id: `generated-result-${testCase.id}`,
        generated_json: generatedJson,
        user_prompt: testCase.user_prompt,
        raw_content: response.content
      }
    } catch (error) {
      console.error('Error generating result for test case:', error)
      // Return a failed generation result
      return {
        id: `failed-result-${testCase.id}`,
        generated_json: null,
        user_prompt: testCase.user_prompt,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
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
        // Default judge prompt (matches database version)
        judgePromptText = `EVALUATION TASK: Compare AI-generated weather dashboard configurations.
IMPORTANT: You are an EVALUATOR, not a JSON generator. Do NOT create layer JSON.

USER REQUEST: "{{user_input}}"

EXPECTED JSON (Reference):
{{expected_json}}

GENERATED JSON (To Evaluate):
{{generated_json}}

Evaluate how well the generated JSON matches the expected JSON. Consider:
1. **Weather Layers**: Correct weather parameters included?
2. **Layer Configuration**: Proper layer settings and parameters?
3. **Structure**: Valid JSON structure and completeness?
4. **Additional Value**: Useful additional layers beyond minimum?

Penalize missing layers much more than additional layers that are not part of the original JSON. As long as the map depicts what the user asked for, the score should be above 8.

CRITICAL INSTRUCTIONS:
- You are EVALUATING, not generating new JSON
- Do NOT return layer configurations
- Do NOT return JSON arrays or objects
- ONLY return the XML format below

REQUIRED RESPONSE FORMAT (copy exactly):
<score>8</score>
<details>Your evaluation explanation here</details>

Example response:
<score>7</score>
<details>Generated JSON has correct weather parameters but missing opacity settings and has different color_map values than expected.</details>`
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
          id: 'google/gemini-2.5-flash',
          name: 'Gemini 2.5 Flash',
          provider: 'openrouter',
          price_per_1k_tokens: 0.0001, // Gemini Flash pricing
          is_pinned: false
        }
      }

      // Process the judge prompt template with actual values
      const processedPrompt = judgePromptText
        .replace(/\{\{user_input\}\}/g, userPrompt)
        .replace(/\{\{expected_json\}\}/g, JSON.stringify(expectedJson, null, 2))
        .replace(/\{\{generated_json\}\}/g, JSON.stringify(generatedJson, null, 2))

      // Route to appropriate service based on model provider (same logic as GenerationService)
      let response;
      if (judgeModel.provider === 'openrouter') {
        response = await OpenRouterService.generateCompletion(processedPrompt, judgeModel)
      } else {
        // Default to OpenAI service for 'openai' provider and others
        response = await OpenAIService.generateCompletion(processedPrompt, judgeModel)
      }

      // Parse the response - handle both XML and JSON formats
      const responseText = response.content || ''
      
      // Enhanced logging for debugging
      console.log('=== JUDGE MODEL DEBUG ===')
      console.log('Full response length:', responseText.length)
      console.log('Full response content:', responseText)
      console.log('=========================')
      
      let score: number | null = null // Use null to indicate parsing failure
      let details = 'No explanation provided'
      let parseSuccess = false

      // First try XML format (primary expected format based on judge prompt)
      const scoreMatchXML = responseText.match(/<score>(\d+)<\/score>/i)
      const detailsMatchXML = responseText.match(/<details>(.*?)<\/details>/si)

      if (scoreMatchXML && detailsMatchXML) {
        score = parseInt(scoreMatchXML[1])
        details = detailsMatchXML[1].trim()
        parseSuccess = true
        console.log('✅ Parsed XML format - Score:', score, 'Details length:', details.length)
      } else {
        // Fallback: Try to parse legacy text format (SCORE: X DETAILS: Y)
        const textScoreMatch = responseText.match(/SCORE:\s*(\d+)/i)
        const textDetailsMatch = responseText.match(/DETAILS:\s*(.*?)(?=\n\s*$|$)/si)
        
        if (textScoreMatch) {
          score = parseInt(textScoreMatch[1])
          if (textDetailsMatch) {
            details = textDetailsMatch[1].trim()
          }
          parseSuccess = true
          console.log('✅ Parsed legacy text format - Score:', score, 'Details length:', details.length)
        } else {
          // Try multiple JSON formats
          try {
            const jsonMatch = responseText.match(/[[{][\s\S]*[\]}]/);
            if (jsonMatch) {
              const parsedJson = JSON.parse(jsonMatch[0]);
              
              // Format 1: Standard {score, details}
              if (typeof parsedJson.score === 'number' && typeof parsedJson.details === 'string') {
                score = parsedJson.score;
                details = parsedJson.details;
                parseSuccess = true;
                console.log('✅ Parsed JSON format (standard) - Score:', score, 'Details length:', details.length);
              }
              // Format 2: Alternative field names {similarity_score, explanation}
              else if (typeof parsedJson.similarity_score === 'number' && typeof parsedJson.explanation === 'string') {
                score = parsedJson.similarity_score;
                details = parsedJson.explanation;
                parseSuccess = true;
                console.log('✅ Parsed JSON format (similarity_score/explanation) - Score:', score, 'Details length:', details.length);
              }
              // Format 3: Nested array format [{"evaluation": {"score": ..., "details": ...}}]
              else if (Array.isArray(parsedJson) && parsedJson.length > 0 && parsedJson[0].evaluation) {
                const evaluation = parsedJson[0].evaluation;
                if (typeof evaluation.score === 'number' && typeof evaluation.details === 'string') {
                  score = evaluation.score;
                  details = evaluation.details;
                  parseSuccess = true;
                  console.log('✅ Parsed JSON format (nested array) - Score:', score, 'Details length:', details.length);
                }
              }
              // Format 4: Direct nested {evaluation: {score, details}}
              else if (parsedJson.evaluation && typeof parsedJson.evaluation.score === 'number' && typeof parsedJson.evaluation.details === 'string') {
                score = parsedJson.evaluation.score;
                details = parsedJson.evaluation.details;
                parseSuccess = true;
                console.log('✅ Parsed JSON format (nested evaluation) - Score:', score, 'Details length:', details.length);
              }
            }
          } catch (jsonError) {
            console.log('❌ JSON parsing failed:', jsonError);
          }

          // Fallback patterns if JSON parsing didn't work
          if (!parseSuccess) {
            const scorePattern = responseText.match(/(?:score|similarity_score)[:\s]*(\d+)/i)
            const detailsPattern = responseText.match(/(?:details|explanation)[:\s]*['"](.*?)['"]/si)
            
            if (scorePattern && detailsPattern) {
              score = parseInt(scorePattern[1])
              details = detailsPattern[1].trim()
              parseSuccess = true
              console.log('✅ Parsed with fallback patterns - Score:', score, 'Details length:', details.length)
            } else {
              console.log('❌ All parsing methods failed')
              // Instead of defaulting to score 5, mark as failed
              score = null
              details = `⚠️ Judge response parsing failed\nJudge Evaluation:\n${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`
            }
          }
        }
      }

      // Final validation
      if (score !== null && (score < 1 || score > 10)) {
        console.log('⚠️ Score out of range, marking as failed:', score)
        score = null
        details = `Invalid score (${score}) out of range 1-10.\nJudge Evaluation:\n${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`
      }

      console.log('Final result - Score:', score, 'Details length:', details.length, 'Parse success:', parseSuccess)
      return { score: score || 0, details } // Return 0 for failed parsing to distinguish from valid scores

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
  private static async markBatchRunFailed(id: string): Promise<void> {
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
          prompts!batch_evaluation_runs_prompt_id_fkey(name, version),
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
          evaluation_test_cases(name, user_prompt, expected_json)
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
        prompt_version: run.prompt_version,
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
          prompts!batch_evaluation_runs_prompt_id_fkey(name, version),
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