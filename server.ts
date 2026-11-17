import express from 'express';
import path from 'path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { dbService } from './src/server/db';
import {
  evaluateSubmission,
  generateProgressiveHint,
  askFollowUpInterviewer,
  dryRunCodeCheck
} from './src/server/gemini';
import { runSqlInSandbox } from './src/server/sqlSandbox';
import { Question, Submission, User, UserRole } from './src/types';

dotenv.config();

interface AuthenticatedRequest extends express.Request {
  authUser?: User;
}

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function createSessionToken(user: User, secret: string): string {
  const payload = {
    sub: user.id,
    role: user.role || 'candidate',
    exp: Date.now() + TOKEN_TTL_MS
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifySessionToken(token: string, secret: string): { sub: string; role: UserRole; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

    const sigBuf = Buffer.from(sigB64);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (!decoded?.sub || typeof decoded.exp !== 'number' || Date.now() > decoded.exp) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const sessionSecret = dbService.getSessionSecret();

  app.use(express.json({ limit: '10mb' }));

  const extractBearerToken = (req: express.Request): string | null => {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') return null;
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token.trim();
  };

  // Attaches req.authUser if a valid signed token is present
  const attachAuthUser = (req: AuthenticatedRequest, _res: express.Response, next: express.NextFunction) => {
    const token = extractBearerToken(req);
    if (token) {
      const claims = verifySessionToken(token, sessionSecret);
      if (claims) {
        const user = dbService.getUserById(claims.sub);
        if (user) {
          req.authUser = user;
        }
      }
    }
    next();
  };

  app.use('/api', attachAuthUser);

  const requireAuth = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
    }
    next();
  };

  const requireAdmin = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required. Please log in as an administrator.' });
    }
    if (req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access forbidden. Administrator privileges required.' });
    }
    next();
  };

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // User Registration
  app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    try {
      const userRecord = dbService.registerUser(name, email, password);
      if (!userRecord) {
        return res.status(400).json({ error: 'This email is already registered or reserved. Please log in instead.' });
      }

      const cleanUser: User = {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
        registeredAt: userRecord.registeredAt
      };
      const token = createSessionToken(cleanUser, sessionSecret);

      res.status(201).json({
        success: true,
        user: cleanUser,
        token
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Server error during registration.', details: err.message });
    }
  });

  // User Login
  app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
      const requestedRole: UserRole | undefined = role === 'admin' || role === 'candidate' ? role : undefined;
      const result = dbService.authenticateUser(email, password, requestedRole);
      if (!result.user) {
        return res.status(401).json({ error: result.error || 'Invalid email or password.' });
      }

      const cleanUser: User = {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        registeredAt: result.user.registeredAt
      };
      const token = createSessionToken(cleanUser, sessionSecret);

      res.json({
        success: true,
        user: cleanUser,
        token
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Server error during authentication.', details: err.message });
    }
  });

  // Active Profile Match
  app.get('/api/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ success: true, user: req.authUser });
  });

  // Get all interview questions
  app.get('/api/questions', (_req, res) => {
    try {
      const questions = dbService.getQuestions();
      res.json(questions);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve questions.', details: err.message });
    }
  });

  // Get question by ID
  app.get('/api/questions/:id', (req, res) => {
    try {
      const question = dbService.getQuestionById(req.params.id);
      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }
      res.json(question);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve question details.', details: err.message });
    }
  });

  // Progressive AI hint (1..3 levels)
  app.post('/api/hint', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { questionId, currentAnswer, hintLevel } = req.body;
    if (!questionId) {
      return res.status(400).json({ error: 'Question ID is required.' });
    }
    const levelNum = Number(hintLevel);
    const level: 1 | 2 | 3 = levelNum === 3 ? 3 : levelNum === 2 ? 2 : 1;

    try {
      const question = dbService.getQuestionById(questionId);
      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }
      const result = await generateProgressiveHint(question, typeof currentAnswer === 'string' ? currentAnswer : '', level);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Unable to generate hint.' });
    }
  });

  // Post-evaluation Interactive Follow-Up Interviewer Chat
  app.post('/api/followup', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { submissionId, history, userMessage } = req.body;
    const authUser = req.authUser!;

    if (!submissionId || typeof userMessage !== 'string' || !userMessage.trim()) {
      return res.status(400).json({ error: 'submissionId and non-empty userMessage are required.' });
    }

    try {
      const submission = dbService.getSubmissionById(submissionId);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found.' });
      }
      if (authUser.role !== 'admin' && submission.userId !== authUser.id) {
        return res.status(403).json({ error: 'Access denied to this submission.' });
      }

      const question = dbService.getQuestionById(submission.questionId);
      if (!question) {
        return res.status(404).json({ error: 'Associated question not found.' });
      }

      const reply = await askFollowUpInterviewer(
        question,
        submission.answerText,
        submission.evaluation.score,
        Array.isArray(history) ? history : [],
        userMessage.trim()
      );
      res.json({ reply });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Follow-up interviewer failed.' });
    }
  });

  // AI Dry-Run Check for Python / Java or custom challenges without local JS suites
  app.post('/api/dry-run', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { questionId, code, codeLanguage } = req.body;
    if (!questionId || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Question ID and non-empty code are required.' });
    }

    try {
      const question = dbService.getQuestionById(questionId);
      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }
      const result = await dryRunCodeCheck(question, code, codeLanguage || 'TypeScript');
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'AI dry-run failed.' });
    }
  });

  // Isolated in-memory SQL Sandbox runner
  app.post('/api/run-sql', requireAuth, (req: AuthenticatedRequest, res) => {
    const { questionId, query } = req.body;
    if (typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'A non-empty SQL query is required.' });
    }

    try {
      const question = questionId ? dbService.getQuestionById(questionId) : undefined;
      const result = runSqlInSandbox(query, question?.sqlSetup);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'SQL execution failed.' });
    }
  });

  // Per-user Bookmarks
  app.get('/api/bookmarks', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const bookmarks = dbService.getBookmarkedQuestionIds(req.authUser!.id);
      res.json({ bookmarks });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve bookmarks.', details: err.message });
    }
  });

  app.post('/api/bookmarks/:questionId/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const question = dbService.getQuestionById(req.params.questionId);
      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }
      const result = dbService.toggleBookmark(req.authUser!.id, req.params.questionId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update bookmark.', details: err.message });
    }
  });

  // Submit answer and run AI evaluation
  app.post('/api/evaluate', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { questionId, answerText, codeLanguage, durationSeconds, hintsUsed } = req.body;
    const authUser = req.authUser!;

    if (!questionId || typeof answerText !== 'string' || !answerText.trim()) {
      return res.status(400).json({ error: 'Question ID and non-empty answer text are required.' });
    }

    try {
      const question = dbService.getQuestionById(questionId);
      if (!question) {
        return res.status(404).json({ error: 'Target question not found.' });
      }

      const normalizedHints =
        typeof hintsUsed === 'number' && hintsUsed >= 0 ? Math.min(3, Math.round(hintsUsed)) : 0;

      const evaluation = await evaluateSubmission(question, answerText, codeLanguage, normalizedHints);

      const submission: Submission = {
        id: 'sub_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12),
        userId: authUser.id,
        questionId: question.id,
        questionTitle: question.title,
        category: question.category,
        type: question.type,
        answerText,
        codeLanguage,
        durationSeconds: typeof durationSeconds === 'number' && durationSeconds >= 0 ? Math.round(durationSeconds) : undefined,
        hintsUsed: normalizedHints,
        timestamp: new Date().toISOString(),
        evaluation
      };

      const savedSubmission = dbService.addSubmission(submission);
      res.json({ success: true, submission: savedSubmission });
    } catch (err: any) {
      console.error('Submission evaluation error:', err);
      res.status(500).json({ error: 'Evaluation failed during server-side processing.', details: err.message });
    }
  });

  // Retrieve authenticated user's submissions
  app.get('/api/submissions', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const submissions = dbService.getSubmissions(req.authUser!.id);
      res.json(submissions);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve practice history.', details: err.message });
    }
  });

  // Delete specific submission (owner or admin)
  app.delete('/api/submissions/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = req.authUser!.role === 'admin';
      const deleted = dbService.deleteSubmission(req.params.id, req.authUser!.id, isAdmin);
      if (deleted) {
        res.json({ success: true, message: 'Practice attempt deleted.' });
      } else {
        res.status(404).json({ error: 'Attempt log not found or permission denied.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Error modifying submission record.', details: err.message });
    }
  });

  // Create custom practice question (Admin only)
  app.post('/api/questions', requireAdmin, (req: AuthenticatedRequest, res) => {
    const { title, category, type, difficulty, description, initialCode, solutionTemplate, expectedOutcomes, keywords, testCases, sqlSetup } = req.body;

    if (!title || !category || !type || !difficulty || !description) {
      return res.status(400).json({ error: 'Title, category, type, difficulty, and description are required.' });
    }

    try {
      const newQuestion: Question = {
        id: 'q_custom_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10),
        title,
        category,
        type,
        difficulty,
        description,
        initialCode: initialCode || '',
        solutionTemplate: solutionTemplate || '',
        expectedOutcomes: Array.isArray(expectedOutcomes) ? expectedOutcomes : [],
        keywords: Array.isArray(keywords) ? keywords : [],
        isCustom: true,
        testCases: Array.isArray(testCases) ? testCases : [],
        sqlSetup: typeof sqlSetup === 'string' ? sqlSetup : ''
      };

      const saved = dbService.addQuestion(newQuestion, req.authUser);
      res.status(201).json(saved);
    } catch (err: any) {
      res.status(500).json({ error: 'Unable to save custom practice question.', details: err.message });
    }
  });

  // Update existing practice question (Admin only)
  app.put('/api/questions/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const { title, category, type, difficulty, description, initialCode, solutionTemplate, expectedOutcomes, keywords, testCases, sqlSetup } = req.body;
    try {
      const updated = dbService.updateQuestion(req.params.id, {
        title,
        category,
        type,
        difficulty,
        description,
        initialCode,
        solutionTemplate,
        expectedOutcomes,
        keywords,
        testCases: Array.isArray(testCases) ? testCases : undefined,
        sqlSetup: typeof sqlSetup === 'string' ? sqlSetup : undefined
      }, req.authUser);

      if (updated) {
        res.json({ success: true, question: updated });
      } else {
        res.status(404).json({ error: 'Question not found.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Unable to update question.', details: err.message });
    }
  });

  // Delete practice question (Admin only)
  app.delete('/api/questions/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    try {
      const success = dbService.deleteQuestion(req.params.id, req.authUser);
      if (success) {
        res.json({ success: true, message: 'Question successfully deleted.' });
      } else {
        res.status(404).json({ error: 'Question not found.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Unable to complete deletion request.', details: err.message });
    }
  });

  // Submit feedback
  app.post('/api/feedback', (req: AuthenticatedRequest, res) => {
    const { userName, userEmail, rating, category, message } = req.body;

    if (!rating || !category || !message) {
      return res.status(400).json({ error: 'Rating, category, and message are required.' });
    }

    try {
      const finalName = req.authUser?.name || userName || 'Guest User';
      const finalEmail = req.authUser?.email || userEmail || 'guest@mockmind.internal';

      const feedback = dbService.addFeedback({
        id: 'fb_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10),
        userId: req.authUser?.id,
        userName: finalName,
        userEmail: finalEmail,
        rating: Number(rating),
        category,
        message,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({ success: true, feedback });
    } catch (err: any) {
      res.status(500).json({ error: 'Unable to save feedback.', details: err.message });
    }
  });

  // Admin endpoints
  app.get('/api/admin/feedbacks', requireAdmin, (_req, res) => {
    try {
      res.json(dbService.getFeedbacks());
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve feedbacks.', details: err.message });
    }
  });

  app.get('/api/admin/activities', requireAdmin, (_req, res) => {
    try {
      res.json(dbService.getActivityLogs());
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve activity logs.', details: err.message });
    }
  });

  app.get('/api/admin/users', requireAdmin, (_req, res) => {
    try {
      res.json(dbService.getAllUsers());
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve registered users.', details: err.message });
    }
  });

  app.get('/api/admin/submissions', requireAdmin, (_req, res) => {
    try {
      res.json(dbService.getSubmissions());
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve submissions.', details: err.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MockMind server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Critical failure starting MockMind server:', error);
});
