// Assessment Module Type Templates
// These define reusable configurations for different AM types

import type { AssessmentModuleTemplate } from './types';

export const assessmentModuleTemplates: AssessmentModuleTemplate[] = [
  {
    id: 'definition-quiz',
    name: 'Definition Quiz',
    description: 'Tests understanding of key terms and definitions from the text',
    question_type: 'definition',
    default_config: {
      question_prompt: `Generate questions that test the student's understanding of key terms and definitions from the provided text. Each question should ask for a clear, accurate definition of an important concept.`,
      question_count: 5,
      difficulty: 'medium',
      evaluation_rubric: {
        definition_accuracy: 0.6,
        example_provided: 0.2,
        context_understanding: 0.2,
      },
      allow_multiple_attempts: true,
      provide_immediate_feedback: true,
      show_correct_answers_after: 'completion',
      rag_context_count: 8,
    },
  },
  {
    id: 'socratic-discussion',
    name: 'Socratic Discussion',
    description: 'Prompts deep thinking about themes, arguments, and implications',
    question_type: 'socratic',
    default_config: {
      question_prompt: `Generate Socratic questions that encourage deep thinking about the themes, arguments, and implications in the provided text. Questions should be open-ended and require students to analyze, evaluate, and synthesize ideas rather than simply recall facts.`,
      question_count: 3,
      difficulty: 'hard',
      evaluation_rubric: {
        critical_thinking: 0.4,
        context_understanding: 0.3,
        example_provided: 0.2,
        definition_accuracy: 0.1,
      },
      allow_multiple_attempts: true,
      provide_immediate_feedback: false,
      show_correct_answers_after: 'never', // Socratic questions don't have "correct" answers
      rag_context_count: 12, // More context for complex questions
    },
  },
  {
    id: 'multiple-choice-quiz',
    name: 'Multiple Choice Quiz',
    description: 'Quick assessment with multiple choice questions',
    question_type: 'multiple_choice',
    default_config: {
      question_prompt: `Generate multiple choice questions that test comprehension of key concepts from the provided text. Each question should have one clearly correct answer and several plausible distractors.`,
      question_count: 10,
      difficulty: 'medium',
      multiple_choice_options_count: 4,
      allow_multiple_attempts: true,
      provide_immediate_feedback: true,
      show_correct_answers_after: 'immediate',
      rag_context_count: 6,
    },
  },
  {
    id: 'short-answer-comprehension',
    name: 'Short Answer Comprehension',
    description: 'Tests understanding through brief written responses',
    question_type: 'short_answer',
    default_config: {
      question_prompt: `Generate short answer questions that test the student's comprehension of important concepts, events, or ideas from the provided text. Questions should require concise but complete answers (2-3 sentences).`,
      question_count: 5,
      difficulty: 'medium',
      evaluation_rubric: {
        definition_accuracy: 0.5,
        context_understanding: 0.3,
        example_provided: 0.2,
      },
      allow_multiple_attempts: true,
      provide_immediate_feedback: true,
      show_correct_answers_after: 'completion',
      rag_context_count: 8,
    },
  },
];

// Helper function to get a template by ID
export function getTemplateById(id: string): AssessmentModuleTemplate | undefined {
  return assessmentModuleTemplates.find(t => t.id === id);
}

// Helper function to get templates by question type
export function getTemplatesByType(
  questionType: 'definition' | 'socratic' | 'multiple_choice' | 'short_answer'
): AssessmentModuleTemplate[] {
  return assessmentModuleTemplates.filter(t => t.question_type === questionType);
}

// Helper function to get default config for a question type
export function getDefaultConfigForType(
  questionType: 'definition' | 'socratic' | 'multiple_choice' | 'short_answer'
): AssessmentModuleTemplate['default_config'] | undefined {
  const template = assessmentModuleTemplates.find(t => t.question_type === questionType);
  return template?.default_config;
}

