export interface Database {
  public: {
    Tables: {
      prompts: {
        Row: {
          id: string
          name: string
          description: string | null
          template_text: string
          json_prefix: string | null
          json_suffix: string | null
          use_placeholder: boolean
          is_default: boolean
          version: number
          current_version: number
          is_active: boolean
          prompt_type: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          template_text: string
          json_prefix?: string | null
          json_suffix?: string | null
          use_placeholder?: boolean
          is_default?: boolean
          version?: number
          current_version?: number
          is_active?: boolean
          prompt_type?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          template_text?: string
          json_prefix?: string | null
          json_suffix?: string | null
          use_placeholder?: boolean
          is_default?: boolean
          version?: number
          current_version?: number
          is_active?: boolean
          prompt_type?: string
          created_by?: string | null
          updated_at?: string
        }
      }
      prompt_versions: {
        Row: {
          id: string
          prompt_id: string
          version_number: number
          name: string
          description: string | null
          template_text: string
          json_prefix: string | null
          json_suffix: string | null
          use_placeholder: boolean
          created_by: string | null
          created_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          prompt_id: string
          version_number: number
          name: string
          description?: string | null
          template_text: string
          json_prefix?: string | null
          json_suffix?: string | null
          use_placeholder?: boolean
          created_by?: string | null
          created_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          prompt_id?: string
          version_number?: number
          name?: string
          description?: string | null
          template_text?: string
          json_prefix?: string | null
          json_suffix?: string | null
          use_placeholder?: boolean
          created_by?: string | null
          is_active?: boolean
        }
      }
      models: {
        Row: {
          id: string
          name: string
          provider: string
          price_per_1k_tokens: number
          is_pinned: boolean
        }
        Insert: {
          id: string
          name: string
          provider?: string
          price_per_1k_tokens: number
          is_pinned?: boolean
        }
        Update: {
          id?: string
          name?: string
          provider?: string
          price_per_1k_tokens?: number
          is_pinned?: boolean
        }
      }
      user_inputs: {
        Row: {
          id: string
          user_id: string
          text: string
          input_image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          text: string
          input_image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          text?: string
          input_image_url?: string | null
        }
      }
      generation_results: {
        Row: {
          id: string
          user_input_id: string
          prompt_id: string
          prompt_version: number
          model_id: string
          user_id: string
          raw_json: any | null
          final_json: any | null
          cost_chf: number | null
          latency_ms: number | null
          output_image_url: string | null
          manual_score: number | null
          manual_comment: string | null
          overall_score: number | null
          overall_rationale: string | null
          parameter_completeness_score: number | null
          parameter_completeness_rationale: string | null
          structure_quality_score: number | null
          structure_quality_rationale: string | null
          layer_count_score: number | null
          layer_count_rationale: string | null
          layer_count: number | null
          cost_efficiency_score: number | null
          cost_efficiency_rationale: string | null
          performance_score: number | null
          performance_rationale: string | null
          evaluation_timestamp: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_input_id: string
          prompt_id: string
          prompt_version: number
          model_id: string
          user_id: string
          raw_json?: any | null
          final_json?: any | null
          cost_chf?: number | null
          latency_ms?: number | null
          output_image_url?: string | null
          manual_score?: number | null
          manual_comment?: string | null
          overall_score?: number | null
          overall_rationale?: string | null
          parameter_completeness_score?: number | null
          parameter_completeness_rationale?: string | null
          structure_quality_score?: number | null
          structure_quality_rationale?: string | null
          layer_count_score?: number | null
          layer_count_rationale?: string | null
          layer_count?: number | null
          cost_efficiency_score?: number | null
          cost_efficiency_rationale?: string | null
          performance_score?: number | null
          performance_rationale?: string | null
          evaluation_timestamp?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          output_image_url?: string | null
          manual_score?: number | null
          manual_comment?: string | null
          overall_score?: number | null
          overall_rationale?: string | null
          parameter_completeness_score?: number | null
          parameter_completeness_rationale?: string | null
          structure_quality_score?: number | null
          structure_quality_rationale?: string | null
          layer_count_score?: number | null
          layer_count_rationale?: string | null
          layer_count?: number | null
          cost_efficiency_score?: number | null
          cost_efficiency_rationale?: string | null
          performance_score?: number | null
          performance_rationale?: string | null
          evaluation_timestamp?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string | null
          old_values: any | null
          new_values: any | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id?: string | null
          old_values?: any | null
          new_values?: any | null
          created_at?: string
        }
      }
      evaluation_test_cases: {
        Row: {
          id: string
          name: string
          description: string | null
          user_prompt: string
          expected_json: any
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          user_prompt: string
          expected_json: any
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          user_prompt?: string
          expected_json?: any
          is_active?: boolean
          created_by?: string | null
          updated_at?: string
        }
      }
      batch_evaluation_runs: {
        Row: {
          id: string
          name: string | null
          prompt_id: string
          model_id: string
          judge_prompt_id: string | null
          judge_model_id: string | null
          total_test_cases: number
          completed_test_cases: number
          average_score: number | null
          status: string
          started_by: string | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          prompt_id: string
          model_id: string
          judge_prompt_id?: string | null
          judge_model_id?: string | null
          total_test_cases: number
          completed_test_cases?: number
          average_score?: number | null
          status?: string
          started_by?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          completed_test_cases?: number
          average_score?: number | null
          status?: string
          completed_at?: string | null
        }
      }
      batch_evaluation_results: {
        Row: {
          id: string
          batch_run_id: string
          test_case_id: string
          generation_result_id: string | null
          comparison_score: number | null
          comparison_details: string | null
          judge_model_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          batch_run_id: string
          test_case_id: string
          generation_result_id?: string | null
          comparison_score?: number | null
          comparison_details?: string | null
          judge_model_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          comparison_score?: number | null
          comparison_details?: string | null
          judge_model_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Prompt = Database['public']['Tables']['prompts']['Row']
export type PromptInsert = Database['public']['Tables']['prompts']['Insert']
export type PromptUpdate = Database['public']['Tables']['prompts']['Update']

export type PromptVersion = Database['public']['Tables']['prompt_versions']['Row']
export type PromptVersionInsert = Database['public']['Tables']['prompt_versions']['Insert']
export type PromptVersionUpdate = Database['public']['Tables']['prompt_versions']['Update']

export type Model = Database['public']['Tables']['models']['Row']
export type ModelInsert = Database['public']['Tables']['models']['Insert']

export type UserInput = Database['public']['Tables']['user_inputs']['Row']
export type UserInputInsert = Database['public']['Tables']['user_inputs']['Insert']

export type GenerationResult = Database['public']['Tables']['generation_results']['Row']
export type GenerationResultInsert = Database['public']['Tables']['generation_results']['Insert']
export type GenerationResultUpdate = Database['public']['Tables']['generation_results']['Update']

export type AuditLog = Database['public']['Tables']['audit_logs']['Row']

export type EvaluationTestCase = Database['public']['Tables']['evaluation_test_cases']['Row']
export type EvaluationTestCaseInsert = Database['public']['Tables']['evaluation_test_cases']['Insert']
export type EvaluationTestCaseUpdate = Database['public']['Tables']['evaluation_test_cases']['Update']

export type BatchEvaluationRun = Database['public']['Tables']['batch_evaluation_runs']['Row']
export type BatchEvaluationRunInsert = Database['public']['Tables']['batch_evaluation_runs']['Insert']
export type BatchEvaluationRunUpdate = Database['public']['Tables']['batch_evaluation_runs']['Update']

export type BatchEvaluationResult = Database['public']['Tables']['batch_evaluation_results']['Row']
export type BatchEvaluationResultInsert = Database['public']['Tables']['batch_evaluation_results']['Insert']
export type BatchEvaluationResultUpdate = Database['public']['Tables']['batch_evaluation_results']['Update']

// Request/Response types for API operations
export interface CreateUserInputRequest {
  text: string;
  input_image_url?: string;
}

export interface CreateGenerationRequest {
  user_input_id: string;
  prompt_ids: string[];
  model_ids: string[];
}

export interface UpdateGenerationResultRequest {
  manual_score?: number;
  manual_comment?: string;
  output_image_url?: string;
}

export interface CreatePromptRequest {
  name: string;
  description?: string;
  template_text: string;
  json_prefix?: string;
  json_suffix?: string;
  use_placeholder?: boolean;
  prompt_type?: PromptType;
}

export interface UpdatePromptRequest extends Partial<CreatePromptRequest> {
  version?: number;
}

// API Response types
export interface GenerationResponse {
  results: GenerationResult[];
  total_cost_chf: number;
  total_latency_ms: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Generation status tracking
export type GenerationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface GenerationProgress {
  user_input_id: string;
  status: GenerationStatus;
  completed_models: string[];
  total_models: number;
  current_model?: string;
  error_message?: string;
  estimated_cost_chf?: number;
}

// File upload types
export interface FileUploadResponse {
  url: string;
  path: string;
  bucket: string;
}

// Authentication user profile
export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
}

// Supabase Auth types extension
export interface AuthUser {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
}

// Error types
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isLoading: boolean;
  isValid: boolean;
}

// Cost calculation types
export interface CostEstimate {
  model_id: string;
  estimated_tokens: number;
  estimated_cost_chf: number;
}

export interface CostBreakdown {
  estimates: CostEstimate[];
  total_estimated_cost_chf: number;
  warning?: string; // If over budget threshold
}

// Model execution types
export interface ModelExecution {
  model_id: string;
  status: GenerationStatus;
  start_time?: string;
  end_time?: string;
  tokens_used?: number;
  cost_chf?: number;
  error?: string;
}

// Settings and configuration
export interface UserSettings {
  max_cost_per_generation_chf: number;
  default_models: string[];
  default_prompt_id?: string;
  enable_auto_evaluation: boolean;
}

// Search and filtering
export interface SearchFilters {
  query?: string;
  model_ids?: string[];
  date_from?: string;
  date_to?: string;
  manual_score_min?: number;
  manual_score_max?: number;
  cost_min?: number;
  cost_max?: number;
}

export interface SortOptions {
  field: 'created_at' | 'cost_chf' | 'latency_ms' | 'manual_score' | 'overall_score' | 'parameter_completeness_score' | 'structure_quality_score' | 'layer_count_score' | 'cost_efficiency_score' | 'performance_score';
  direction: 'asc' | 'desc';
}

// Generation service specific types
export interface CostGuardrailResult {
  canProceed: boolean;
  totalCost: number;
  warning?: string;
}

export interface GenerationError {
  model_id: string;
  error_type: 'timeout' | 'rate_limit' | 'auth' | 'invalid_response' | 'unknown';
  message: string;
  retryable: boolean;
}

// Batch evaluation specific types
export type BatchEvaluationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BatchEvaluationProgress {
  run_id: string;
  status: BatchEvaluationStatus;
  completed_test_cases: number;
  total_test_cases: number;
  current_test_case?: string;
  average_score?: number;
  error_message?: string;
  estimated_time_remaining?: number;
}

export interface BatchEvaluationSummary {
  run_id: string;
  prompt_name: string;
  model_name: string;
  total_test_cases: number;
  completed_test_cases: number;
  average_score: number | null;
  status: BatchEvaluationStatus;
  started_at: string;
  completed_at: string | null;
  duration_ms?: number;
  results: BatchEvaluationResult[];
}

export interface StartBatchEvaluationRequest {
  prompt_id: string;
  model_id: string;
  judge_prompt_id?: string; // If not provided, uses default judge prompt
  judge_model_id?: string; // If not provided, uses default judge model
  test_case_ids?: string[]; // If empty, runs all active test cases
  name?: string;
}

// Prompt type enum
export type PromptType = 'generation' | 'judge'; 