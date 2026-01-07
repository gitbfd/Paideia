// src/lib/assessment-modules/llm.ts
// LLM functions for question generation and answer evaluation

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini'; // Use a cost-effective model by default

export interface QuestionGenerationParams {
  ragChunks: Array<{ content: string; similarity?: number }>;
  questionType: 'definition' | 'socratic' | 'multiple_choice' | 'short_answer';
  questionPrompt?: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  metadata?: Record<string, any>;
}

export async function generateQuestions(
  params: QuestionGenerationParams
): Promise<GeneratedQuestion[]> {
  if (!OPENAI_API_KEY) {
    console.error('[LLM] OPENAI_API_KEY is missing');
    throw new Error('OPENAI_API_KEY is required for question generation. Please add it to your .env.local file.');
  }

  const { ragChunks, questionType, questionPrompt, questionCount, difficulty } = params;
  
  console.log('[LLM] Generating questions:', {
    ragChunksCount: ragChunks.length,
    questionType,
    questionCount,
    difficulty,
    hasCustomPrompt: !!questionPrompt,
  });

  // Combine RAG chunks into context
  const context = ragChunks.length > 0
    ? ragChunks.map((chunk, i) => `[Chunk ${i + 1}]\n${chunk.content}`).join('\n\n')
    : 'No specific context provided. Generate general questions about the course topic.';
  
  if (ragChunks.length === 0) {
    console.warn('[LLM] No RAG chunks provided - questions will be less contextual');
  }

  // Build the prompt based on question type
  const defaultPrompts = {
    definition: `Generate ${questionCount} definition questions that test understanding of key terms and concepts from the provided text. Each question should ask for a clear, accurate definition of an important concept.`,
    socratic: `Generate ${questionCount} Socratic questions that encourage deep thinking about the themes, arguments, and implications in the provided text. Questions should be open-ended and require students to analyze, evaluate, and synthesize ideas.`,
    multiple_choice: `Generate ${questionCount} multiple choice questions that test comprehension of key concepts from the provided text. Each question should have one clearly correct answer and several plausible distractors.`,
    short_answer: `Generate ${questionCount} short answer questions that test the student's comprehension of important concepts, events, or ideas from the provided text. Questions should require concise but complete answers (2-3 sentences).`,
  };

  const basePrompt = questionPrompt || defaultPrompts[questionType];
  const systemPrompt = `You are an expert educator creating assessment questions. Generate questions based on the provided text content. Return your response as a JSON object with a "questions" array.`;

  const userPrompt = `${basePrompt}

Difficulty level: ${difficulty}

Text content:
${context}

Return a JSON object with a "questions" array containing exactly ${questionCount} question objects. Each object should have:
- "question_text": The question to ask
- "correct_answer": A reference answer (for multiple choice, use the option ID like "a", "b", etc.)
- "metadata": Additional data (for multiple choice, include "options" array with {"id": "a", "text": "Option text"} objects)

Format your response as valid JSON only, no markdown or explanation. Example format:
{
  "questions": [
    {
      "question_text": "What is...?",
      "correct_answer": "The answer is...",
      "metadata": {}
    }
  ]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error('[LLM] No content in OpenAI response:', data);
      throw new Error('No content in OpenAI response');
    }

    console.log('[LLM] Received response from OpenAI, length:', content.length);

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(content);
      console.log('[LLM] Parsed JSON successfully');
    } catch (parseError: any) {
      console.error('[LLM] JSON parse error:', parseError.message);
      console.error('[LLM] Response content:', content.substring(0, 500));
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1]);
          console.log('[LLM] Extracted JSON from code block');
        } catch (e) {
          throw new Error(`Failed to parse JSON from code block: ${e}`);
        }
      } else {
        throw new Error(`Failed to parse JSON from LLM response: ${parseError.message}`);
      }
    }
    
    // Handle both {questions: [...]} and [...] formats
    const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];

    console.log('[LLM] Extracted questions:', questions.length);

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error('[LLM] Invalid question format:', parsed);
      throw new Error('Invalid question format returned from LLM - expected array of questions');
    }

    const formattedQuestions = questions.slice(0, questionCount).map((q: any, index: number) => {
      const formatted = {
        question_text: q.question_text || q.question || `Question ${index + 1}`,
        correct_answer: q.correct_answer || q.answer || 'No answer provided',
        metadata: q.metadata || {},
      };
      
      if (!formatted.question_text || formatted.question_text === `Question ${index + 1}`) {
        console.warn(`[LLM] Question ${index + 1} missing question_text:`, q);
      }
      
      return formatted;
    });

    console.log('[LLM] Returning formatted questions:', formattedQuestions.length);
    return formattedQuestions;
  } catch (error: any) {
    console.error('[LLM] Question generation error:', error);
    throw new Error(`Failed to generate questions: ${error.message}`);
  }
}

export interface AnswerEvaluationParams {
  question: string;
  correctAnswer: string;
  studentAnswer: string;
  questionType: 'definition' | 'socratic' | 'multiple_choice' | 'short_answer';
  rubric?: Record<string, number>;
}

export interface EvaluationResult {
  score: number; // 0-1
  feedback: string;
}

export async function evaluateAnswer(
  params: AnswerEvaluationParams
): Promise<EvaluationResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for answer evaluation');
  }

  const { question, correctAnswer, studentAnswer, questionType, rubric } = params;

  // For multiple choice, just check if answer matches
  if (questionType === 'multiple_choice') {
    const isCorrect = studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    return {
      score: isCorrect ? 1 : 0,
      feedback: isCorrect
        ? 'Correct!'
        : `Incorrect. The correct answer is: ${correctAnswer}`,
    };
  }

  // For other types, use LLM evaluation
  const systemPrompt = `You are an expert educator evaluating student answers. Provide fair, constructive feedback and a score from 0.0 to 1.0.`;

  const rubricText = rubric
    ? `\n\nEvaluation rubric (weights):\n${Object.entries(rubric)
        .map(([key, weight]) => `- ${key}: ${(weight * 100).toFixed(0)}%`)
        .join('\n')}`
    : '';

  const userPrompt = `Question: ${question}

Reference Answer: ${correctAnswer}

Student Answer: ${studentAnswer}

Question Type: ${questionType}${rubricText}

Evaluate the student's answer and provide:
1. A score from 0.0 to 1.0 (where 1.0 is perfect)
2. Constructive feedback explaining what was correct and what could be improved

Return your response as JSON with:
- "score": number between 0.0 and 1.0
- "feedback": string with your evaluation

Format your response as valid JSON only, no markdown.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent evaluation
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const parsed = JSON.parse(content);
    
    return {
      score: Math.max(0, Math.min(1, parsed.score || 0)),
      feedback: parsed.feedback || 'No feedback provided',
    };
  } catch (error: any) {
    console.error('[LLM] Answer evaluation error:', error);
    throw new Error(`Failed to evaluate answer: ${error.message}`);
  }
}

