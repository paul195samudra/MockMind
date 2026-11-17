import { GoogleGenAI, Type } from '@google/genai';
import { Question, EvaluationResult, FollowUpMessage } from '../types';

const GEMINI_MODEL = 'gemini-4-hydrogen';

let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is missing. Please add it from Settings > Secrets.');
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiInstance;
}

export async function evaluateSubmission(
  question: Question,
  userAnswer: string,
  codeLanguage?: string,
  hintsUsed = 0
): Promise<EvaluationResult> {
  const ai = getGeminiClient();

  const prompt = `You are an elite, senior tech interviewer assessing a candidate on the following question. Make your assessment constructive, highly detailed, encouraging, and technically rigorous.

---
QUESTION TITLE: ${question.title}
CATEGORY: ${question.category}
TYPE: ${question.type} (coding or conceptual)
DIFFICULTY: ${question.difficulty}
PROGRESSIVE HINTS REVEALED BY CANDIDATE: ${hintsUsed} out of 3

DESCRIPTION:
${question.description}

${question.solutionTemplate ? `REFERENCE SOLUTION EXPECTATIONS:\n${question.solutionTemplate}` : ''}
${question.expectedOutcomes ? `EXPECTED OUTCOMES:\n${question.expectedOutcomes.map((o, idx) => `${idx + 1}. ${o}`).join('\n')}` : ''}
${question.keywords ? `RELEVANT TECHNICAL KEYWORDS:\n${question.keywords.join(', ')}` : ''}
---

CANDIDATE SUBMISSION:
Language specified: ${codeLanguage || 'N/A'}
Answer text / Code:
\`\`\`${codeLanguage || ''}
${userAnswer}
\`\`\`

---
INSTRUCTIONS FOR EVALUATION:
1. **Assign a score (0 to 100)**:
   - 90-100: Pristine work. Fully functional, optimal time/space complexity, handles edge cases, zero bugs, uses best-practice paradigms.
   - 75-89: Solid solution. Solves the primary criteria well, with minor edge case gaps or styling improvements.
   - 50-74: Fair intermediate effort. Solves components but has logical mistakes, misses key outcomes, or lacks key structures.
   - 0-49: Non-functional or extremely deficient. Missing bulk of expected code, or is unrelated.
2. **Correctness assessment**: Analyze exactly which of the expected outcomes were met, which keywords were correctly used, and identify any errors, bugs, or omissions.
3. **Strengths**: List 2-3 specific technical strengths of their code/text.
4. **Weaknesses / Area for growth**: List 2-3 concrete ways to optimize their design, styling, or implementation.
5. **Model Answer**: Provide a pristine, highly commented exemplary response or code sample for this specific question.
6. **Follow-up Question**: Write 1 pointed, realistic interviewer follow-up question tailored directly to the candidate's submitted code/answer (e.g., probing a scalability bottleneck, complexity improvement, or edge case they missed).
7. **Code Review Suggestions** (Only for coding questions):
   - Suggest direct micro-optimizations or bug repairs.
   - Refer to approximate line numbers of the candidate's code where possible.
   - Classify severity strictly as 'info', 'warning', or 'critical'.

Please output the evaluation structured strictly in the requested JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['score', 'summary', 'correctness', 'strengths', 'weaknesses', 'modelAnswer', 'followUpQuestion'],
          properties: {
            score: {
              type: Type.INTEGER,
              description: 'An integer final practice grade from 0 to 100.'
            },
            summary: {
              type: Type.STRING,
              description: 'A 2-4 sentence high-level overview of the submission and advice.'
            },
            correctness: {
              type: Type.STRING,
              description: 'Detailed assessment of whether the user answered the core concepts and handled edge cases.'
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of positive attributes of their submission.'
            },
            weaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of specific flaws, vulnerabilities, or missed edge cases.'
            },
            modelAnswer: {
              type: Type.STRING,
              description: 'An elegant reference solution block to teach the candidate.'
            },
            followUpQuestion: {
              type: Type.STRING,
              description: 'One realistic senior-interviewer follow-up question specific to this submission.'
            },
            codeReview: {
              type: Type.OBJECT,
              properties: {
                suggestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ['severity', 'message'],
                    properties: {
                      line: {
                        type: Type.INTEGER,
                        description: 'Optional. Approximate line number in candidate code.'
                      },
                      severity: {
                        type: Type.STRING,
                        description: "Must be 'info', 'warning', or 'critical'."
                      },
                      message: {
                        type: Type.STRING,
                        description: 'The explanation of the improvement or error.'
                      },
                      suggestion: {
                        type: Type.STRING,
                        description: 'Short suggested refactor or code snippet.'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini API returned empty evaluation content.');
    }

    const parsed: EvaluationResult = JSON.parse(text);
    return parsed;
  } catch (err: any) {
    console.error('Gemini API Evaluation Failure:', err);
    throw new Error(`Evaluation service error: ${err.message || 'Unknown error communicating with AI model.'}`);
  }
}

export async function generateProgressiveHint(
  question: Question,
  currentAnswer: string,
  hintLevel: 1 | 2 | 3
): Promise<{ level: number; title: string; hint: string }> {
  const ai = getGeminiClient();

  const levelDescriptions: Record<1 | 2 | 3, string> = {
    1: 'Level 1 (Nudge): Give a gentle conceptual clue about which core angle, data structure, or framework to consider without spoiling the solution.',
    2: 'Level 2 (Structural Approach): Outline the concrete algorithm steps, schema/system pillars, or edge cases to handle.',
    3: 'Level 3 (Near-Solution Scaffold): Provide pseudocode, key formula, or concrete structure skeleton while still letting the candidate write the final answer.'
  };

  const prompt = `You are a supportive senior technical interviewer helping a candidate during practice without giving away the full answer prematurely.

QUESTION: ${question.title} (${question.category}, ${question.difficulty}, ${question.type})
DESCRIPTION:
${question.description}

${question.expectedOutcomes ? `RUBRIC GOALS:\n${question.expectedOutcomes.join('\n')}` : ''}

CANDIDATE'S CURRENT DRAFT:
${currentAnswer?.trim() ? currentAnswer : '(Empty draft so far)'}

REQUESTED HINT DEPTH:
${levelDescriptions[hintLevel]}

Respond strictly in JSON with a short hint title (3-6 words) and clear, actionable hint text (2-4 sentences max).`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        required: ['title', 'hint'],
        properties: {
          title: { type: Type.STRING },
          hint: { type: Type.STRING }
        }
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned an empty hint response.');
  }
  const parsed = JSON.parse(text);
  return {
    level: hintLevel,
    title: parsed.title || `Hint ${hintLevel}`,
    hint: parsed.hint
  };
}

export async function askFollowUpInterviewer(
  question: Question,
  submissionAnswer: string,
  score: number,
  history: FollowUpMessage[],
  userMessage: string
): Promise<string> {
  const ai = getGeminiClient();

  const transcript = history
    .slice(-10)
    .map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n\n');

  const prompt = `You are conducting a live post-submission technical follow-up discussion as a senior staff interviewer.

QUESTION: ${question.title} (${question.category}, ${question.difficulty})
QUESTION PROMPT:
${question.description}

CANDIDATE'S SUBMITTED ANSWER (Scored ${score}%):
${submissionAnswer}

CONVERSATION SO FAR:
${transcript || '(Starting discussion)'}

CANDIDATE'S LATEST MESSAGE:
${userMessage}

Reply concisely (3-6 sentences), directly addressing their point, confirming if their reasoning/fix is sound, clarifying trade-offs or edge cases, and optionally posing a crisp deeper follow-up if helpful.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Follow-up interviewer returned an empty response.');
  }
  return text;
}

export async function dryRunCodeCheck(
  question: Question,
  code: string,
  codeLanguage: string
): Promise<{
  passed: boolean;
  cases: Array<{
    name: string;
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    error?: string;
  }>;
  error?: string;
}> {
  const ai = getGeminiClient();

  const customCasesText =
    question.testCases && question.testCases.length > 0
      ? `CUSTOM TEST CASES TO VERIFY:\n${JSON.stringify(question.testCases, null, 2)}`
      : 'Design 3-4 representative test cases (happy path, edge case, boundary/invalid input) derived directly from the problem statement.';

  const prompt = `You are a deterministic compiler & trace-execution engine for ${codeLanguage}.
Do NOT be lenient: mentally trace the exact code line-by-line on each test input and report genuine bugs, syntax errors, or wrong return values.

PROBLEM: ${question.title}
${question.description}

${customCasesText}

CANDIDATE ${codeLanguage} CODE:
\`\`\`${codeLanguage}
${code}
\`\`\`

Return strictly valid JSON matching the schema with 3 to 5 test case trace results.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        required: ['passed', 'cases'],
        properties: {
          passed: { type: Type.BOOLEAN },
          error: { type: Type.STRING },
          cases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['name', 'input', 'expected', 'actual', 'passed'],
              properties: {
                name: { type: Type.STRING },
                input: { type: Type.STRING },
                expected: { type: Type.STRING },
                actual: { type: Type.STRING },
                passed: { type: Type.BOOLEAN },
                error: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('AI dry-run returned an empty response.');
  }

  const parsed = JSON.parse(text);
  const cases = Array.isArray(parsed.cases) ? parsed.cases : [];
  return {
    passed: Boolean(parsed.passed) && cases.every((c: any) => Boolean(c.passed)),
    cases,
    error: parsed.error
  };
}
