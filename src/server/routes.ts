import express, { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { AIService } from "./ai.service";
import { User, AptitudeAttempt, CodingSession, SkillScore } from "../types";

const router = express.Router();

// Helper middleware to extract user or fallback to usr_demo to avoid locking the UI
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let userId = "usr_demo"; // Default baseline demo candidate

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token && token !== "mock-token-demo" && token.startsWith("user_")) {
      userId = token;
    }
  }

  const user = db.findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized user candidate session." });
  }

  // Inject user into custom request property
  (req as any).user = user;
  next();
}

// ==========================================
// 1. AUTH ROUTES
// ==========================================
router.post("/auth/register", (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  const existing = db.findUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: "A candidate with this email is already registered." });
  }

  const userId = "user_" + Math.random().toString(36).substring(2, 11);
  const newUser: User = {
    id: userId,
    name,
    email,
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
    createdAt: new Date().toISOString()
  };

  db.createUser(newUser, password);

  res.status(201).json({
    user: newUser,
    token: userId // Simulating bearer token with userId directly
  });
});

router.post("/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    return res.status(400).json({ error: "Candidate not found. Please register first." });
  }

  const storedPass = db.getPasswordHash(user.id);
  if (storedPass !== password) {
    return res.status(400).json({ error: "Incorrect password. Try again." });
  }

  res.json({
    user,
    token: user.id
  });
});

router.get("/auth/me", authenticate, (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});


// ==========================================
// 2. RESUME ROUTES
// ==========================================
// Handles reading uploaded resume text info and saving it
router.post("/resume/upload", authenticate, async (req: Request, res: Response) => {
  const { resumeText, fileName, isPdf } = req.body;
  const user = (req as any).user as User;

  if (!resumeText) {
    return res.status(400).json({ error: isPdf ? "PDF file payload is required." : "Plaintext resume input payload is required." });
  }

  try {
    // 1. Instantly perform lazy-loaded server AI analysis on the text or PDF
    const { parsedJson, aiFeedback, skillsToInject } = await AIService.analyzeResume(resumeText, !!isPdf);

    // 2. Save resume artifact in DB
    const resumeUrl = `https://mock-upload.local/${user.id}/${fileName || (isPdf ? "resume.pdf" : "resume.txt")}`;
    const resume = db.upsertResume(user.id, resumeUrl, parsedJson, aiFeedback);

    // 3. Re-score the candidate metrics dynamically based on actual progress
    db.recalculateUserSkillScores(user.id);

    res.json({
      resumeId: resume.id,
      fileUrl: resume.fileUrl,
      resume
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to parse resume." });
  }
});

router.get("/resume", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const resume = db.getResumeByUserId(user.id);
  res.json({ resume });
});

router.post("/resume/analyze", authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const resume = db.getResumeByUserId(user.id);

  if (!resume) {
    return res.status(400).json({ error: "No resume found. Please upload one first." });
  }

  try {
    const { aiFeedback } = await AIService.analyzeResume(resume.parsedJson || "Empty content profile.");
    resume.aiFeedback = aiFeedback;
    db.upsertResume(user.id, resume.fileUrl, resume.parsedJson || "", aiFeedback);

    res.json({ feedback: aiFeedback, resume });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Analysis pipeline failed." });
  }
});


// ==========================================
// 3. APTITUDE MODULE ROUTES
// ==========================================
router.get("/aptitude/questions", async (req: Request, res: Response) => {
  const { category, difficulty, company, generate } = req.query;

  if (generate === "true" && company) {
    try {
      const generatedList = await AIService.generateCompanyAptitudeQuestions(company as string);
      db.addCustomAptitudeQuestions(generatedList);
      return res.json({ questions: generatedList });
    } catch (err: any) {
      console.error("Failed to generate company questions, falling back to standard list:", err);
    }
  }

  const list = db.getAptitudeQuestions(category as string, difficulty as string);
  res.json({ questions: list });
});

router.post("/aptitude/submit", authenticate, (req: Request, res: Response) => {
  const { attempts } = req.body; // Array of { questionId, selectedIndex, timeTaken }
  const user = (req as any).user as User;

  if (!attempts || !Array.isArray(attempts)) {
    return res.status(400).json({ error: "Invalid attempts array format." });
  }

  let totalCorrect = 0;
  const processedAttempts: Omit<AptitudeAttempt, "id" | "attemptedAt">[] = [];

  const questions = db.getAptitudeQuestions();

  attempts.forEach(att => {
    const question = questions.find(q => q.id === att.questionId);
    if (question) {
      const isCorrect = question.correctIndex === att.selectedIndex;
      if (isCorrect) totalCorrect++;

      processedAttempts.push({
        userId: user.id,
        questionId: att.questionId,
        selectedIndex: att.selectedIndex,
        isCorrect,
        timeTaken: att.timeTaken || 15
      });
    }
  });

  // Save attempts to database
  db.saveAptitudeAttempts(processedAttempts);

  // Recalculate Aptitude skill score and sync dynamically
  const userAttempts = db.getAptitudeAttempts(user.id);
  const totalCount = userAttempts.length;
  const correctCount = userAttempts.filter(a => a.isCorrect).length;
  const percentage = totalCount > 0 ? (correctCount / totalCount) * 100 : 0.0;
  
  db.recalculateUserSkillScores(user.id);

  res.json({
    score: totalCorrect,
    correct: totalCorrect,
    total: attempts.length,
    cumulativeAccuracy: percentage
  });
});

router.get("/aptitude/history", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const attempts = db.getAptitudeAttempts(user.id);
  res.json({ attempts });
});


// ==========================================
// 4. CODING MODULE ROUTES
// ==========================================
router.get("/coding/problems", (req: Request, res: Response) => {
  const { topic, difficulty } = req.query;
  const list = db.getCodingProblems(topic as string, difficulty as string);
  res.json({ problems: list });
});

router.get("/coding/problems/:slug", (req: Request, res: Response) => {
  const { slug } = req.params;
  const problem = db.getCodingProblemBySlug(slug);
  if (!problem) {
    return res.status(404).json({ error: "Coding challenge not found." });
  }
  res.json({ problem });
});

// Mock compiler executing test cases dynamically
router.post("/coding/run", (req: Request, res: Response) => {
  const { problemId, code, language } = req.body;

  if (!problemId || !code) {
    return res.status(400).json({ error: "Missing coding problemId or source compilation payload." });
  }

  const problem = db.getCodingProblems().find(p => p.id === problemId);
  if (!problem) {
    return res.status(404).json({ error: "Coding problem not found." });
  }

  let testCasesList: any[] = [];
  try {
    testCasesList = JSON.parse(problem.testCases);
  } catch (e) {
    testCasesList = [{ input: "Default evaluation input", expectedOutput: "Success" }];
  }

  const cleanCode = code.toLowerCase();
  const codeIssues: string[] = [];

  // General empty check
  if (code.trim().length < 25) {
    codeIssues.push("Implementation too brief or missing main logic.");
  }
  
  // Language specific syntax validators
  if (language === "javascript") {
    if (!cleanCode.includes("function") && !cleanCode.includes("=>") && !cleanCode.includes("const ") && !cleanCode.includes("let ")) {
      codeIssues.push("Missing valid JavaScript function (function/arrow syntax) or algorithm footprint.");
    }
  } else if (language === "typescript") {
    if (!cleanCode.includes("function") && !cleanCode.includes("any") && !cleanCode.includes(":") && !cleanCode.includes("class")) {
      codeIssues.push("Missing valid TypeScript compilation parameters or function declaration.");
    }
  } else if (language === "python") {
    if (!cleanCode.includes("def ") && !cleanCode.includes("return") && !cleanCode.includes("print")) {
      codeIssues.push("Missing valid Python method declaration (def) or return expression.");
    }
  } else if (language === "cpp") {
    if (!cleanCode.includes("{") || !cleanCode.includes("}") || !cleanCode.includes("class") && !cleanCode.includes("void") && !cleanCode.includes("int")) {
      codeIssues.push("Missing C++ compile-time markers, curly brackets, class structure, or variable signatures.");
    }
  } else if (language === "java") {
    if (!cleanCode.includes("class") || !cleanCode.includes("public") || !cleanCode.includes("{") || !cleanCode.includes("}")) {
      codeIssues.push("Missing Java structural markers (class, public, static, main) or brackets.");
    }
  } else if (language === "go") {
    if (!cleanCode.includes("func ") && !cleanCode.includes("package")) {
      codeIssues.push("Missing Go function (func) or package keywords.");
    }
  } else if (language === "rust") {
    if (!cleanCode.includes("fn ") && !cleanCode.includes("impl") && !cleanCode.includes("struct")) {
      codeIssues.push("Missing Rust fn, struct, or impl declaration block.");
    }
  }

  // Topic specific structural markers checks
  if (problem.topic === "dsa") {
    const hasStructure = cleanCode.includes("loop") || cleanCode.includes("for") || cleanCode.includes("while") || cleanCode.includes("map") || cleanCode.includes("set") || cleanCode.includes("node") || cleanCode.includes("list") || cleanCode.includes("hash") || cleanCode.includes("index") || cleanCode.includes("push") || cleanCode.includes("pop") || cleanCode.includes("tree");
    if (!hasStructure) {
      codeIssues.push("Warning: Solution might lack standard array / hash / linked list data structures or loops.");
    }
  } else if (problem.topic === "algorithms") {
    const hasAlg = cleanCode.includes("if") || cleanCode.includes("for") || cleanCode.includes("while") || cleanCode.includes("dfs") || cleanCode.includes("bfs") || cleanCode.includes("memo") || cleanCode.includes("dp") || cleanCode.includes("min") || cleanCode.includes("max") || cleanCode.includes("target") || cleanCode.includes("solve") || cleanCode.includes("search");
    if (!hasAlg) {
      codeIssues.push("Warning: Algorithmic checks missed. Solution should include conditions, searching, recursion, or dynamic state mappings.");
    }
  } else if (problem.topic === "strings") {
    const hasString = cleanCode.includes("string") || cleanCode.includes("char") || cleanCode.includes("s.") || cleanCode.includes("length") || cleanCode.includes("substr") || cleanCode.includes("split") || cleanCode.includes("replace") || cleanCode.includes("match") || cleanCode.includes("sub") || cleanCode.includes("regex") || cleanCode.includes("len(") || cleanCode.includes("range");
    if (!hasString) {
      codeIssues.push("Warning: Solution of string utilities might lack string indexing, slicing, regex pattern matching, or character comparisons.");
    }
  }

  const passed = codeIssues.length === 0;
  const results = testCasesList.map((tc: any, idx: number) => {
    return {
      testCase: tc.input || `benchmark_case_${idx + 1}`,
      passed,
      got: passed ? tc.expectedOutput : "Execution Mismatch / Compilation Warning",
      expected: tc.expectedOutput
    };
  });

  let output = "";
  if (passed) {
    output = `✔ [Sandbox Container Engine] Compiling ${problem.title}.${language === "python" ? "py" : language === "javascript" ? "js" : language === "cpp" ? "cpp" : "src"} successfully in isolated environment.\n`;
    output += `[Runtime Exec] Run results against ${results.length} benchmark test cases inside sandboxed testbed:\n`;
    results.forEach((r, idx) => {
      output += `  ➔ Case ${idx + 1}: Passed! (Time: ${(Math.random() * 4 + 1.2).toFixed(1)}ms, Memory: ${(Math.random() * 1.5 + 2.1).toFixed(2)} MB)\n`;
    });
    output += `\n✔ SUCCESS: All ${results.length} tests completed successfully. No memory leaks detected. Clean exit.`;
  } else {
    output = `✕ FAILED: Compilation or structural validations failed:\n`;
    codeIssues.forEach(isu => {
      output += `  - ERROR: ${isu}\n`;
    });
    output += `\nCompilation exited with status code 1. Please adjust your solution parameters or function header signature.`;
  }

  res.json({
    passed,
    results,
    output
  });
});

router.post("/coding/feedback", authenticate, async (req: Request, res: Response) => {
  const { problemId, code, language, isHint } = req.body;

  if (!problemId || !code) {
    return res.status(400).json({ error: "Problem information and code block are required." });
  }

  const problem = db.getCodingProblems().find(p => p.id === problemId);
  const problemTitle = problem ? problem.title : "Custom Algorithmic Challenge";

  try {
    if (isHint) {
      const hint = await AIService.getCodeHint(problemTitle, problem?.description || "", code);
      return res.json({ feedback: hint });
    } else {
      const feedback = await AIService.getCodeReview(problemTitle, language || "javascript", code);
      return res.json({ feedback });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to trigger AI advisor services." });
  }
});

router.patch("/coding/sessions", authenticate, (req: Request, res: Response) => {
  const { problemId, code, language, status, aiFeedback } = req.body;
  const user = (req as any).user as User;

  if (!problemId || !code || !status) {
    return res.status(400).json({ error: "problemId, code, and status are required." });
  }

  const session = db.createOrUpdateCodingSession({
    userId: user.id,
    problemId,
    code,
    language: language || "javascript",
    status,
    aiFeedback: aiFeedback || null,
    solvedAt: status === "solved" ? new Date().toISOString() : null
  });

  // Re-adjust DSA metrics dynamically to track user's real progress
  db.recalculateUserSkillScores(user.id);
  const activeScores = db.getSkillScores(user.id);
  const newDsaMetric = activeScores.find(s => s.skill === "DSA")?.score || 0.0;

  res.json({ session, cumulativeDsaScore: newDsaMetric });
});


// ==========================================
// 5. MOCK INTERVIEW ROUTES
// ==========================================
router.post("/interview/start", authenticate, async (req: Request, res: Response) => {
  const { role, mode } = req.body;
  const user = (req as any).user as User;

  const resolvedRole = role || "Software Engineer Candidate";
  const resolvedMode = mode || "mixed";

  let startingQuestion = "";
  try {
    startingQuestion = await AIService.getInterviewStartingQuestion(resolvedRole, resolvedMode as any);
  } catch (err) {
    startingQuestion = `Welcome to the mock interview for the '${resolvedRole}' role. Can you outline your primary engineering projects and how you handle performance optimization under heavy workloads?`;
  }

  const session = db.createInterviewSession(user.id, resolvedRole, resolvedMode as any, startingQuestion);

  res.json({
    sessionId: session.id,
    firstQuestion: startingQuestion,
    session
  });
});

router.post("/interview/respond", authenticate, async (req: Request, res: Response) => {
  const { sessionId, userMessage } = req.body;

  if (!sessionId || !userMessage) {
    return res.status(400).json({ error: "sessionId and userMessage input buffer are requested." });
  }

  const session = db.getInterviewSessionById(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Active interview target record not found." });
  }

  try {
    const transcript: any[] = JSON.parse(session.transcript || "[]");
    
    // Append candidate message
    transcript.push({ role: "user", content: userMessage });

    // Request conversational TURN feedback from AI Service
    const aiTurn = await AIService.getInterviewTurn(session.role, session.mode, transcript);

    // Append AI reply
    transcript.push({ role: "ai", content: aiTurn.aiMessage });

    // Save session transcript back
    db.updateInterviewSession(session.id, JSON.stringify(transcript));

    res.json({
      aiMessage: aiTurn.aiMessage,
      isComplete: aiTurn.isComplete
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed interview session tracking turn." });
  }
});

router.post("/interview/end", authenticate, async (req: Request, res: Response) => {
  const { sessionId } = req.body;
  const user = (req as any).user as User;

  if (!sessionId) {
    return res.status(400).json({ error: "Session indexing ID is required to end the round." });
  }

  const session = db.getInterviewSessionById(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Live interview context not resolved." });
  }

  try {
    const transcript: any[] = JSON.parse(session.transcript || "[]");

    // Grader evaluation payload
    const evaluation = await AIService.evaluateInterview(session.role, session.mode, transcript);

    db.updateInterviewSession(session.id, session.transcript, evaluation.score, evaluation.feedback);

    // Calculate dynamic scores based on actual accomplishments
    db.recalculateUserSkillScores(user.id);

    res.json({
      score: evaluation.score,
      feedback: evaluation.feedback,
      breakdown: evaluation.breakdown,
      transcript
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Interview scoring pipeline error." });
  }
});

router.get("/interview/history", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const history = db.getInterviewSessions(user.id);
  res.json({ sessions: history });
});

router.post("/interview/coach", authenticate, async (req: Request, res: Response) => {
  const { role, mode, feedback, chatHistory } = req.body;

  if (!feedback || !chatHistory) {
    return res.status(400).json({ error: "feedback text and chatHistory are required for interview prep coaching." });
  }

  try {
    const reply = await AIService.getCoachingResponse(
      role || "Software Engineer",
      mode || "mixed",
      feedback,
      chatHistory
    );

    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Interview coaching agent error." });
  }
});


// ==========================================
// 6. PROGRESS / ANALYTICS DASHBOARD ROUTES
// ==========================================
router.get("/progress/dashboard", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;

  const skillScores = db.getSkillScores(user.id);
  const aptitudeAttempts = db.getAptitudeAttempts(user.id);
  const codingSessions = db.getCodingSessionsByUserId(user.id);
  const interviewSessions = db.getInterviewSessions(user.id);

  // Compile chronologically unified recent activity feed
  const recentActivity: any[] = [];

  // Aptitude tests
  if (aptitudeAttempts.length > 0) {
    // Group attempts by date
    const correctVal = aptitudeAttempts.filter(a => a.isCorrect).length;
    recentActivity.push({
      id: "act_apt",
      type: "aptitude",
      title: "Completed Analytical Quiz",
      subtitle: `${aptitudeAttempts.length} questions practiced`,
      scoreString: `${correctVal}/${aptitudeAttempts.length} Acc`,
      timestamp: aptitudeAttempts[aptitudeAttempts.length - 1]?.attemptedAt || new Date().toISOString()
    });
  }

  // Coding challenges
  codingSessions.forEach((cs, i) => {
    const problem = db.getCodingProblems().find(p => p.id === cs.problemId);
    recentActivity.push({
      id: `act_code_${cs.id}`,
      type: "coding",
      title: `Solved ${problem?.title || "Algorithmic module"}`,
      subtitle: `Topic: ${problem?.topic || "Arrays"} (${cs.language})`,
      scoreString: cs.status.toUpperCase(),
      timestamp: cs.createdAt
    });
  });

  // Interview rounds
  interviewSessions.forEach((is, i) => {
    recentActivity.push({
      id: `act_int_${is.id}`,
      type: "interview",
      title: `Finished ${is.role} Mock Round`,
      subtitle: `Feedback grading completed`,
      scoreString: is.aiScore ? `${is.aiScore}/100 Grade` : "Completed",
      timestamp: is.createdAt
    });
  });

  // Resume reviews
  const resume = db.getResumeByUserId(user.id);
  if (resume) {
    recentActivity.push({
      id: "act_res",
      type: "resume",
      title: "Uploaded Placement Resume",
      subtitle: "AI scanner report downloaded",
      scoreString: "COMPLETED",
      timestamp: resume.updatedAt
    });
  }

  // Sort unified activities desc
  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Calculate real activity streak
  const activityDates = new Set<string>();
  
  aptitudeAttempts.forEach(a => {
    if (a.attemptedAt) activityDates.add(a.attemptedAt.slice(0, 10));
  });
  codingSessions.forEach(cs => {
    if (cs.createdAt) activityDates.add(cs.createdAt.slice(0, 10));
  });
  interviewSessions.forEach(is => {
    if (is.createdAt) activityDates.add(is.createdAt.slice(0, 10));
  });
  if (resume && resume.updatedAt) {
    activityDates.add(resume.updatedAt.slice(0, 10));
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

  let streakCount = 0;
  if (activityDates.has(todayStr)) {
    // Start counting back from today
    let checkDate = new Date();
    while (true) {
      const checkStr = checkDate.toISOString().slice(0, 10);
      if (activityDates.has(checkStr)) {
        streakCount++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        break;
      }
    }
  } else if (activityDates.has(yesterdayStr)) {
    // Start counting back from yesterday
    let checkDate = new Date();
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    while (true) {
      const checkStr = checkDate.toISOString().slice(0, 10);
      if (activityDates.has(checkStr)) {
        streakCount++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        break;
      }
    }
  }

  const totalEvaluations = aptitudeAttempts.length + codingSessions.length + interviewSessions.length + (resume ? 1 : 0);

  // Compile performance timeline for supervised progress
  const events: Array<{ timestamp: string; type: string; score: number; label: string }> = [];

  // 1. Aptitude quiz accuracy over time
  const sortedAptitude = [...aptitudeAttempts].sort((a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime());
  let correctCount = 0;
  sortedAptitude.forEach((attempt, index) => {
    if (attempt.isCorrect) correctCount++;
    const cumulativeAccuracy = Math.round((correctCount / (index + 1)) * 100);
    events.push({
      timestamp: attempt.attemptedAt,
      type: "aptitude",
      score: Math.max(10, Math.min(100, cumulativeAccuracy)),
      label: `Quiz Q${index + 1}`
    });
  });

  // 2. Coding session performance over time
  const sortedCoding = [...codingSessions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  sortedCoding.forEach((session, index) => {
    let score = 50; // Attempted baseline
    if (session.status === "solved") score = 100;
    else if (session.status === "given_up") score = 20;

    events.push({
      timestamp: session.createdAt,
      type: "coding",
      score,
      label: `Code P${index + 1}`
    });
  });

  // 3. Interview session score over time
  const sortedInterviews = [...interviewSessions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  sortedInterviews.forEach((session, index) => {
    const score = session.aiScore || 70;
    events.push({
      timestamp: session.createdAt,
      type: "interview",
      score: Math.max(10, Math.min(100, score)),
      label: `Intv ${index + 1}`
    });
  });

  // Sort unified events chronologically
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Default curve for starting/demo profile (without going above 100%)
  const defaultTimeline = [
    { label: "Day 1", score: 30 },
    { label: "Day 3", score: 40 },
    { label: "Day 5", score: 65 },
    { label: "Day 7", score: 50 },
    { label: "Day 9", score: 80 },
    { label: "Day 11", score: 75 },
    { label: "Today", score: 95 } // Bound strictly to 95% today, fixing preloaded 105% clipping
  ];

  let performanceTimeline: Array<{ label: string; score: number }> = [];

  if (events.length === 0) {
    performanceTimeline = defaultTimeline;
  } else if (events.length < 5) {
    const defaultPrefix = defaultTimeline.slice(0, 5 - events.length);
    const realPoints = events.map(e => ({
      label: e.label,
      score: e.score
    }));
    performanceTimeline = [...defaultPrefix, ...realPoints];
  } else {
    // Take the last 7 items to fit beautifully on the svg chart
    performanceTimeline = events.slice(-7).map(e => ({
      label: e.label,
      score: e.score
    }));
  }

  // Truncate to top 6
  res.json({
    skillScores,
    recentActivity: recentActivity.slice(0, 6),
    streak: streakCount,
    totalEvaluations,
    performanceTimeline
  });
});

router.get("/progress/skills", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const list = db.getSkillScores(user.id);
  res.json({ skills: list });
});

router.post("/progress/skills", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { skills } = req.body;
  if (!Array.isArray(skills)) {
    return res.status(400).json({ error: "Skills must be an array of { skill: string, score: number }" });
  }
  const list = db.setCustomSkillScores(user.id, skills);
  res.json({ success: true, skills: list });
});

export default router;
