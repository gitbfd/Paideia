// Type definitions for Assessment Module configurations

export type QuestionType = 'definition' | 'socratic' | 'multiple_choice' | 'short_answer';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface EvaluationRubric {
  definition_accuracy?: number;
  example_provided?: number;
  context_understanding?: number;
  critical_thinking?: number;
  [key: string]: number | undefined; // Allow custom rubric criteria
}

export interface MultipleChoiceOption {
  id: string;
  text: string;
}

export interface AssessmentModuleConfig {
  // Question generation
  question_prompt?: string; // Custom prompt for LLM question generation
  question_count: number;
  difficulty: Difficulty;
  
  // Evaluation
  evaluation_rubric?: EvaluationRubric; // For rubric-based scoring
  
  // Behavior
  allow_multiple_attempts: boolean;
  time_limit_minutes?: number; // Optional time limit
  
  // Multiple choice specific
  multiple_choice_options_count?: number; // Number of options for MC questions
  
  // RAG configuration
  rag_context_count?: number; // Number of RAG chunks to use (default: 8)
  rag_similarity_threshold?: number; // Minimum similarity score (0-1)
  
  // Feedback
  provide_immediate_feedback?: boolean;
  show_correct_answers_after?: 'immediate' | 'completion' | 'never';
  
  // Custom metadata
  metadata?: Record<string, any>;
}

export interface AssessmentModuleTemplate {
  id: string;
  name: string;
  description: string;
  question_type: QuestionType;
  default_config: AssessmentModuleConfig;
}

