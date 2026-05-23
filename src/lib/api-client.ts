/**
 * Shared API Client wrapper for Smart Placement Preparation Platform
 */

const API_BASE = "/api/v1";

function getHeaders() {
  const token = localStorage.getItem("placement_token") || "mock-token-demo";
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

export const api = {
  // Auth
  async register(name: string, email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to register candidate.");
    localStorage.setItem("placement_token", data.token);
    return data;
  },

  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to login.");
    localStorage.setItem("placement_token", data.token);
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      localStorage.removeItem("placement_token");
      throw new Error("Invalid session.");
    }
    return res.json();
  },

  // Resume
  async uploadResume(resumeText: string, fileName: string) {
    const res = await fetch(`${API_BASE}/resume/upload`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ resumeText, fileName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "File parse error.");
    return data;
  },

  async getResume() {
    const res = await fetch(`${API_BASE}/resume`, {
      headers: getHeaders()
    });
    return res.json();
  },

  // Aptitude
  async getAptitudeQuestions(category?: string, difficulty?: string, company?: string, generate?: boolean) {
    const query = new URLSearchParams();
    if (category) query.append("category", category);
    if (difficulty) query.append("difficulty", difficulty);
    if (company) query.append("company", company);
    if (generate) query.append("generate", "true");
    const res = await fetch(`${API_BASE}/aptitude/questions?${query.toString()}`);
    return res.json();
  },

  async submitAptitude(attempts: { questionId: string; selectedIndex: number; timeTaken: number }[]) {
    const res = await fetch(`${API_BASE}/aptitude/submit`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ attempts })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to submit questions score.");
    return data;
  },

  // Coding
  async getCodingProblems(topic?: string, difficulty?: string) {
    const query = new URLSearchParams();
    if (topic) query.append("topic", topic);
    if (difficulty) query.append("difficulty", difficulty);
    const res = await fetch(`${API_BASE}/coding/problems?${query.toString()}`);
    return res.json();
  },

  async runCode(problemId: string, code: string, language: string) {
    const res = await fetch(`${API_BASE}/coding/run`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ problemId, code, language })
    });
    return res.json();
  },

  async getCodeFeedback(problemId: string, code: string, language: string, isHint = false) {
    const res = await fetch(`${API_BASE}/coding/feedback`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ problemId, code, language, isHint })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed loading AI review suggestions.");
    return data;
  },

  async saveCodingSession(problemId: string, code: string, language: string, status: "attempted" | "solved" | "given_up", aiFeedback?: string | null) {
    const res = await fetch(`${API_BASE}/coding/sessions`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ problemId, code, language, status, aiFeedback })
    });
    return res.json();
  },

  // Interview
  async startInterview(role: string, mode: "technical" | "hr" | "mixed") {
    const res = await fetch(`${API_BASE}/interview/start`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ role, mode })
    });
    return res.json();
  },

  async respondInterview(sessionId: string, userMessage: string) {
    const res = await fetch(`${API_BASE}/interview/respond`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ sessionId, userMessage })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Interview turn error.");
    return data;
  },

  async endInterview(sessionId: string) {
    const res = await fetch(`${API_BASE}/interview/end`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ sessionId })
    });
    return res.json();
  },

  // Dashboard / Progress
  async getDashboard() {
    const res = await fetch(`${API_BASE}/progress/dashboard`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async saveCustomSkills(skills: { skill: string; score: number }[]) {
    const res = await fetch(`${API_BASE}/progress/skills`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ skills })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save custom subjects.");
    return data;
  }
};
