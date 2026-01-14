// src/components/AssessmentModule.tsx
// Student-facing assessment module component

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { convertInlineMarkdownToHtml } from '@/lib/assessment-modules/markdown-inline';

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  correct_answer: string;
  metadata?: Record<string, any>;
  order_index: number;
  answer?: {
    id: string;
    answer_text: string;
    score: number;
    feedback: string;
    evaluated_at: string;
  } | null;
};

type Session = {
  id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  score?: number;
  attempt_number: number;
  assessment_modules: {
    id: string;
    title: string;
    description?: string;
    question_type: string;
    config?: Record<string, any>;
  };
};

type Props = {
  courseSlug: string;
  moduleId: string;
};

export default function AssessmentModule({ courseSlug, moduleId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Start or resume assessment session
  useEffect(() => {
    async function startSession() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/courses/${courseSlug}/assessment-modules/${moduleId}/start`, {
          method: 'POST',
        });
        const json = await res.json();
        if (!res.ok) {
          const errorMessage = json.error || `Failed to start assessment (${res.status})`;
          console.error('[AssessmentModule] Start error:', {
            status: res.status,
            statusText: res.statusText,
            errorMessage,
            fullResponse: JSON.stringify(json, null, 2),
          });
          throw new Error(errorMessage);
        }
        
        console.log('[AssessmentModule] Session started:', json);
        
        // Load session data
        await loadSession(json.session_id);
      } catch (err: any) {
        console.error('[AssessmentModule] Error starting session:', err);
        setError(err.message || 'Failed to start assessment');
      } finally {
        setLoading(false);
      }
    }
    startSession();
  }, [courseSlug, moduleId]);

  async function loadSession(sessionId: string) {
    try {
      const res = await fetch(
        `/courses/${courseSlug}/assessment-modules/${moduleId}/session/${sessionId}`
      );
      const json = await res.json();
      if (!res.ok) {
        console.error('[AssessmentModule] Load session error:', json);
        throw new Error(json.error || 'Failed to load session');
      }
      
      console.log('[AssessmentModule] Session loaded:', {
        session: json.session,
        questionCount: json.questions?.length || 0,
      });
      
      setSession(json.session);
      setQuestions(json.questions || []);
      
      if (!json.questions || json.questions.length === 0) {
        console.warn('[AssessmentModule] No questions found in session');
        setError('No questions were generated. Please try refreshing the page.');
        return;
      }
      
      // Load existing answers
      const existingAnswers: Record<string, string> = {};
      const existingSelections: Record<string, string[]> = {};
      json.questions.forEach((q: Question) => {
        if (q.answer) {
          existingAnswers[q.id] = q.answer.answer_text;
          // Parse multiple selections if comma-separated
          if (q.answer.answer_text.includes(',')) {
            existingSelections[q.id] = q.answer.answer_text.split(',').map(s => s.trim());
          } else {
            existingSelections[q.id] = [q.answer.answer_text];
          }
        }
      });
      setAnswers(existingAnswers);
      setSelectedOptions(existingSelections);
      
      // Check if completed
      if (json.session.status === 'completed') {
        setCompleted(true);
      }
    } catch (err: any) {
      console.error('[AssessmentModule] Error loading session:', err);
      setError(err.message || 'Failed to load session');
    }
  }

  async function submitAnswer(questionId: string, answerText: string) {
    if (!session) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(
        `/courses/${courseSlug}/assessment-modules/${moduleId}/session/${session.id}/answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_id: questionId,
            answer_text: answerText,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit answer');
      
      // Reload session to get updated feedback
      await loadSession(session.id);
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  }

  async function completeAssessment() {
    if (!session) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(
        `/courses/${courseSlug}/assessment-modules/${moduleId}/session/${session.id}/complete`,
        {
          method: 'POST',
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to complete assessment');
      
      setCompleted(true);
      await loadSession(session.id);
    } catch (err: any) {
      setError(err.message || 'Failed to complete assessment');
    } finally {
      setSubmitting(false);
    }
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || '' : '';
  const currentSelections = currentQuestion ? selectedOptions[currentQuestion.id] || [] : [];
  const hasAnswer = currentQuestion?.answer !== null && currentQuestion?.answer !== undefined;
  const isMultipleChoice = currentQuestion?.metadata?.options && Array.isArray(currentQuestion.metadata.options) && currentQuestion.metadata.options.length > 0;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <div className="text-gray-600">Loading assessment...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!session || questions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <div className="text-gray-600">No questions available.</div>
      </div>
    );
  }

  if (completed) {
    const finalScore = session.score || 0;
    return (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 border-b bg-green-50">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Assessment Complete!</h2>
          <div className="text-2xl font-bold text-green-600">
            Score: {finalScore.toFixed(1)}%
          </div>
        </div>
        <div className="p-6 space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="border rounded p-4">
              <div 
                className="font-semibold text-gray-900 mb-2"
                dangerouslySetInnerHTML={{ __html: `Question ${index + 1}: ${convertInlineMarkdownToHtml(q.question_text)}` }}
              />
              {q.answer && (
                <>
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Your answer:</strong>{' '}
                    {q.metadata?.options && q.answer.answer_text.includes(',') ? (
                      // Display multiple selections with option labels
                      <span>
                        {q.answer.answer_text.split(',').map((id: string, idx: number) => {
                          const opt = q.metadata?.options?.find((o: { id: string; text: string }) => o.id === id.trim());
                          return opt ? (
                            <span 
                              key={id}
                              dangerouslySetInnerHTML={{ __html: `${idx > 0 ? ', ' : ''}${convertInlineMarkdownToHtml(opt.text)}` }}
                            />
                          ) : (
                            <span key={id}>{id.trim()}</span>
                          );
                        })}
                      </span>
                    ) : q.metadata?.options ? (
                      // Single selection - find the option text
                      (() => {
                        const answerText = q.answer?.answer_text;
                        if (!answerText) return <span>No answer</span>;
                        const opt = q.metadata?.options?.find((o: { id: string; text: string }) => o.id === answerText.trim());
                        return opt ? (
                          <span dangerouslySetInnerHTML={{ __html: convertInlineMarkdownToHtml(opt.text) }} />
                        ) : (
                          <span>{answerText}</span>
                        );
                      })()
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: convertInlineMarkdownToHtml(q.answer?.answer_text || '') }} />
                    )}
                  </div>
                  <div className="text-sm mb-2">
                    <strong>Score:</strong>{' '}
                    <span className={q.answer.score >= 0.7 ? 'text-green-600' : 'text-orange-600'}>
                      {(q.answer.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  {q.answer.feedback && (
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded mt-2">
                      <strong>Feedback:</strong> {q.answer.feedback}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{session.assessment_modules.title}</h2>
            {session.assessment_modules.description && (
              <p className="text-sm text-gray-600 mt-1">{session.assessment_modules.description}</p>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>
      </div>

      <div className="p-6">
        {currentQuestion && (
          <div className="space-y-4">
            <div 
              className="text-lg font-medium text-gray-900"
              dangerouslySetInnerHTML={{ __html: convertInlineMarkdownToHtml(currentQuestion.question_text) }}
            />

            {isMultipleChoice ? (
              <div className="space-y-2">
                {(currentQuestion.metadata?.options || []).map((opt: { id: string; text: string }) => (
                  <label
                    key={opt.id}
                    className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${
                      currentSelections.includes(opt.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name={`question-${currentQuestion.id}`}
                      value={opt.id}
                      checked={currentSelections.includes(opt.id)}
                      onChange={(e) => {
                        if (hasAnswer) return; // Don't allow changes after submission
                        
                        const newSelections = e.target.checked
                          ? [...currentSelections, opt.id]
                          : currentSelections.filter(id => id !== opt.id);
                        
                        setSelectedOptions({
                          ...selectedOptions,
                          [currentQuestion.id]: newSelections,
                        });
                      }}
                      disabled={hasAnswer}
                      className="mr-3"
                    />
                    <span 
                      className="text-gray-900"
                      dangerouslySetInnerHTML={{ __html: convertInlineMarkdownToHtml(opt.text) }}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                value={currentAnswer}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                disabled={hasAnswer}
                placeholder="Type your answer here..."
                className="w-full border rounded p-3 min-h-[120px] text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            )}

            {hasAnswer && currentQuestion.answer && (
              <div className="mt-4 p-4 bg-gray-50 rounded border">
                <div className="text-sm mb-2">
                  <strong>Score:</strong>{' '}
                  <span className={currentQuestion.answer.score >= 0.7 ? 'text-green-600' : 'text-orange-600'}>
                    {(currentQuestion.answer.score * 100).toFixed(0)}%
                  </span>
                </div>
                {currentQuestion.answer.feedback && (
                  <div className="text-sm text-gray-700">
                    <strong>Feedback:</strong> {currentQuestion.answer.feedback}
                  </div>
                )}
              </div>
            )}

            {!hasAnswer && (
              <button
                onClick={() => {
                  if (isMultipleChoice) {
                    // For multiple choice, join selections with commas
                    const answerText = currentSelections.length > 0 
                      ? currentSelections.join(',')
                      : '';
                    if (answerText) {
                      submitAnswer(currentQuestion.id, answerText);
                    }
                  } else {
                    // For text answers, use the current answer
                    if (currentAnswer) {
                      submitAnswer(currentQuestion.id, currentAnswer);
                    }
                  }
                }}
                disabled={submitting || (isMultipleChoice ? currentSelections.length === 0 : !currentAnswer)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-6 border-t">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 disabled:cursor-default"
          >
            Previous
          </button>

          <div className="flex gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : questions[index].answer
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={completeAssessment}
              disabled={submitting || questions.some(q => !q.answer)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 disabled:cursor-default"
            >
              {submitting ? 'Completing...' : 'Complete Assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

