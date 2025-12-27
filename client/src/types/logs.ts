// AI Log entry representing a single AI processing request
export interface AILog {
  id: number;
  request_id: string;
  batch_id: string | null;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  categorization_prompt: string | null;
  categorization_response: string | null;
  detected_category: string | null;
  categorization_time_ms: number | null;
  categorization_reasoning: string | null;
  llm_category: string | null; // Raw LLM category before validation
  naming_prompt: string | null;
  naming_response: string | null;
  suggested_name: string | null;
  naming_time_ms: number | null;
  naming_reasoning: string | null;
  // Validation fields
  validation_attempts: number | null;
  validation_passed: boolean | null;
  validation_prompt: string | null;
  validation_response: string | null;
  validation_reason: string | null;
  validation_suggested_fix: string | null;
  validation_time_ms: number | null;
  validation_model: string | null;
  validation_history: string | null; // JSON string
  total_time_ms: number | null;
  model_used: string | null;
  status: 'pending' | 'success' | 'error' | 'timeout';
  error_message: string | null;
  error_stack: string | null;
  user_action: 'accepted' | 'edited' | 'rejected' | 'skipped' | null;
  final_name: string | null;
  edit_distance: number | null;
  feedback_at: string | null;
  created_at: string;
  completed_at: string | null;
}

// API Log entry representing an HTTP API call
export interface APILog {
  id: number;
  request_id: string;
  method: string;
  endpoint: string;
  request_body: string | null;
  request_headers: string | null;
  status_code: number | null;
  response_body: string | null;
  response_time_ms: number | null;
  user_agent: string | null;
  ip_address: string | null;
  success: number; // SQLite stores as 0/1
  error_message: string | null;
  created_at: string;
}

// Error Log entry
export interface ErrorLog {
  id: number;
  error_id: string;
  request_id: string | null;
  error_type: 'ai_error' | 'api_error' | 'system_error';
  error_code: string | null;
  error_message: string;
  error_stack: string | null;
  context: string | null;
  file_path: string | null;
  resolved: number; // SQLite stores as 0/1
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

// Paginated response
export interface PaginatedResponse<T> {
  success: boolean;
  logs: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Log statistics
export interface LogStats {
  ai: {
    total: number;
    successful: number;
    failed: number;
    avgResponseTime: number | null;
    avgCategorizationTime: number | null;
    avgNamingTime: number | null;
  };
  errors: {
    total: number;
    unresolved: number;
  };
  api: {
    total: number;
    successful: number;
    avgResponseTime: number | null;
  };
  timeRange: string;
}

// Prompt effectiveness metrics per category
export interface CategoryEffectiveness {
  detected_category: string;
  total_suggestions: number;
  accepted: number;
  edited: number;
  rejected: number;
  skipped: number;
  acceptance_rate: number | null;
  avg_edit_distance: number | null;
}

// Recent rejection/edit entry
export interface RecentRejection {
  request_id: string;
  file_name: string;
  file_path: string;
  detected_category: string;
  suggested_name: string;
  user_action: 'rejected' | 'edited' | null;
  final_name: string | null;
  edit_distance: number | null;
  feedback_at: string | null;
  created_at: string;
  is_regeneration: number | null;
  regeneration_feedback: string | null;
  rejected_name: string | null;
}

// Filter options for AI logs
export interface AILogFilters {
  status?: string;
  category?: string;
  batchId?: string;
  userAction?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// Filter options for API logs
export interface APILogFilters {
  endpoint?: string;
  method?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
}

// Filter options for Error logs
export interface ErrorLogFilters {
  errorType?: string;
  resolved?: boolean;
  startDate?: string;
  endDate?: string;
}

// Feedback payload
export interface FeedbackPayload {
  requestId?: string;
  filePath?: string;
  action: 'accepted' | 'edited' | 'rejected' | 'skipped';
  finalName?: string;
  feedback?: string;
}

// Time range options
export type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all' | 'custom';

// Feedback detail item
export interface FeedbackDetailItem {
  request_id: string;
  file_name: string;
  file_path: string;
  detected_category: string;
  suggested_name: string;
  user_action: 'accepted' | 'edited' | 'rejected' | 'skipped';
  final_name: string | null;
  edit_distance: number | null;
  feedback_at: string;
  created_at: string;
}

// Feedback details response
export interface FeedbackDetailsResponse {
  success: boolean;
  items: FeedbackDetailItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Action type for feedback details
export type FeedbackActionType = 'total' | 'accepted' | 'edited' | 'rejected' | 'skipped';
