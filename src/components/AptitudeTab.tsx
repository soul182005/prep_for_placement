import React, { useState, useEffect, useRef } from "react";
import { Clock, BookOpen, RefreshCw, AlertCircle, CheckCircle, HelpCircle, ArrowRight } from "lucide-react";
import { PrimaryButton, SecondaryButton, BrutalistCard } from "./BrutalistPrimitives";
import { AptitudeQuestion } from "../types";
import { api } from "../lib/api-client";

interface AptitudeTabProps {
  onRefreshStats: () => void;
}

export const AptitudeTab: React.FC<AptitudeTabProps> = ({ onRefreshStats }) => {
  const [category, setCategory] = useState<"quant" | "logical" | "verbal">("quant");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questions, setQuestions] = useState<AptitudeQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [isCompanyMode, setIsCompanyMode] = useState(false);
  const [companyName, setCompanyName] = useState("Google");
  const [customCompanyText, setCustomCompanyText] = useState("");

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      countdownRef.current = setTimeout(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (isActive && secondsLeft === 0) {
      handleNextOrSubmit();
    }

    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [isActive, secondsLeft]);

  const handleStartTest = async () => {
    setLoading(true);
    setResults(null);
    setSelectedAnswers({});
    setCurrentIdx(0);
    setSecondsLeft(60);
    try {
      let resp;
      if (isCompanyMode) {
        const finalCompany = companyName === "Custom" ? (customCompanyText.trim() || "Target Company") : companyName;
        resp = await api.getAptitudeQuestions(undefined, undefined, finalCompany, true);
      } else {
        resp = await api.getAptitudeQuestions(category, difficulty);
      }
      if (resp.questions && resp.questions.length > 0) {
        setQuestions(resp.questions);
        setIsActive(true);
      } else {
        alert("No questions were retrieved. Please select a different topic or click again.");
      }
    } catch (e) {
      console.error("Failed to load questions:", e);
      alert("Failed to fetch assessment questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPractice = () => {
    setResults(null);
    setIsActive(false);
    setQuestions([]);
  };

  const handleSelectOption = (qId: string, idx: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [qId]: idx
    }));
  };

  const handleNextOrSubmit = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSecondsLeft(60);
    } else {
      // Complete aptitude scorecard submission
      setIsActive(false);
      setSubmitting(true);
      try {
        const payload = questions.map(q => ({
          questionId: q.id,
          selectedIndex: selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : -1,
          timeTaken: 60 - secondsLeft
        }));
        const summary = await api.submitAptitude(payload);
        setResults(summary);
        onRefreshStats();
      } catch (err) {
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* HEADER CONTROLS */}
      <div className="border-[#22314D] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between justify-start gap-4 border-b-2">
        <div>
          <h2 className="font-sans text-2xl font-black text-[#F8FAFC]">
            APTITUDE ASSESSMENT
          </h2>
          <p className="font-mono text-xs text-[#CBD5E1]">
            {isCompanyMode
              ? "Simulate professional 15-question screens tailored for your target company."
              : "Practice core quantitative, logical, and verbal topics under interactive timers."}
          </p>
        </div>

        {!isActive && !loading && !results && (
          <div className="flex flex-wrap gap-3 items-center">
            {isCompanyMode ? (
              <>
                <select
                  value={companyName}
                  onChange={(e: any) => setCompanyName(e.target.value)}
                  className="bg-[#111A2E] border-2 border-[#22314D] p-2 text-[#F8FAFC] font-mono text-xs rounded-none cursor-pointer outline-hidden focus:border-[#06B6D4]"
                >
                  <option value="Google">Google</option>
                  <option value="McKinsey">McKinsey (PSG)</option>
                  <option value="Goldman Sachs">Goldman Sachs</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Deloitte">Deloitte</option>
                  <option value="TCS">TCS / Infosys</option>
                  <option value="Morgan Stanley">Morgan Stanley</option>
                  <option value="Meta">Meta</option>
                  <option value="Microsoft">Microsoft</option>
                  <option value="JPMorgan">JPMorgan Chase</option>
                  <option value="Custom">Custom Company...</option>
                </select>

                {companyName === "Custom" && (
                  <input
                    type="text"
                    placeholder="Enter Company Name"
                    value={customCompanyText}
                    onChange={(e: any) => setCustomCompanyText(e.target.value)}
                    className="bg-[#111A2E] border-2 border-[#22314D] p-2 text-[#F8FAFC] font-mono text-xs rounded-none outline-hidden focus:border-[#06B6D4]"
                  />
                )}
              </>
            ) : (
              <>
                <select 
                  value={category} 
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="bg-[#111A2E] border-2 border-[#22314D] p-2 text-[#F8FAFC] font-mono text-xs rounded-none cursor-pointer outline-hidden focus:border-[#06B6D4]"
                >
                  <option value="quant">QUANTITATIVE APTITUDE</option>
                  <option value="logical">LOGICAL REASONING</option>
                  <option value="verbal">VERBAL GRAMMAR</option>
                </select>

                <select 
                  value={difficulty} 
                  onChange={(e: any) => setDifficulty(e.target.value)}
                  className="bg-[#111A2E] border-2 border-[#22314D] p-2 text-[#F8FAFC] font-mono text-xs rounded-none cursor-pointer outline-hidden focus:border-[#06B6D4]"
                >
                  <option value="easy font-mono">EASY LEVEL</option>
                  <option value="medium font-mono">MEDIUM LEVEL</option>
                  <option value="hard font-mono">HARD LEVEL</option>
                </select>
              </>
            )}

            <PrimaryButton onClick={handleStartTest} disabled={loading}>
              {loading ? "Generating..." : "Start Assessment"}
            </PrimaryButton>
          </div>
        )}
      </div>

      {!isActive && !loading && !results && (
        <div className="flex gap-2 border-b-2 border-[#22314D] pb-2">
          <button
            onClick={() => setIsCompanyMode(false)}
            className={`px-4 py-2 font-mono text-xs font-black transition-all cursor-pointer ${
              !isCompanyMode
                ? "border-[#06B6D4] text-[#06B6D4] bg-[#06B6D4]/5 border-b-2"
                : "text-[#CBD5E1] hover:text-[#F8FAFC]"
            }`}
          >
            STANDARD TOPIC TESTS
          </button>
          <button
            onClick={() => setIsCompanyMode(true)}
            className={`px-4 py-2 font-mono text-xs font-black transition-all cursor-pointer ${
              isCompanyMode
                ? "border-[#06B6D4] text-[#06B6D4] bg-[#06B6D4]/5 border-b-2"
                : "text-[#CBD5E1] hover:text-[#F8FAFC]"
            }`}
          >
            AI COMPANY SCREENING (15 QUESTIONS)
          </button>
        </div>
      )}

      {/* QUIZ WORKSPACE */}
      {loading ? (
        <div className="p-12 md:p-20 border-2 border-[#06B6D4] bg-[#06B6D4]/5 text-center max-w-2xl mx-auto my-6 flex flex-col items-center gap-4 animate-pulse">
          <RefreshCw className="w-10 h-10 text-[#06B6D4] animate-spin" />
          <h3 className="font-sans text-lg font-black text-[#F8FAFC] uppercase tracking-widest">
            {isCompanyMode ? "Extracting Company Assessments" : "Assembling Challenge Set"}
          </h3>
          <p className="font-mono text-xs text-[#CBD5E1] max-w-md">
            {isCompanyMode 
              ? `Prompting Gemini to compile exactly 15 authentic quantitative, logical, and verbal screening questions asked during recent rounds at ${companyName === "Custom" ? customCompanyText : companyName}...`
              : "Assembling custom curated sample questions from the smart offline preparation cache..."}
          </p>
        </div>
      ) : isActive && questions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* PROGRESS TICKER */}
            <div className="p-4 bg-[#06B6D4]/5 border-l-4 border-[#06B6D4] flex justify-between items-center">
              <span className="font-mono text-xs font-black text-[#06B6D4] uppercase">
                QUESTION {currentIdx + 1} OF {questions.length}
              </span>

              <span className="font-mono text-xs font-black text-[#F8FAFC] flex items-center gap-2 px-2 py-0.5 border border-[#33476E] bg-[#111A2E]">
                <Clock className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span>{secondsLeft}s Remaining</span>
              </span>
            </div>

            {/* QUESTION DISPLAY */}
            <BrutalistCard className="min-h-40">
              <span className="font-mono text-[9px] uppercase text-[#94A3B8] tracking-widest block mb-1">
                // {questions[currentIdx].category?.toUpperCase() || "QUESTION SUMMARY"}
              </span>
              <p className="font-mono text-sm font-bold text-[#F8FAFC] leading-relaxed select-text">
                {questions[currentIdx].questionText}
              </p>
            </BrutalistCard>

            {/* OPTION LIST */}
            <div className="flex flex-col gap-3 mt-2">
              {questions[currentIdx].options.map((opt, oIdx) => {
                const isSelected = selectedAnswers[questions[currentIdx].id] === oIdx;

                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectOption(questions[currentIdx].id, oIdx)}
                    className={cn(
                      "p-4 font-mono text-xs text-left border-2 flex items-center gap-4 transition-all cursor-pointer rounded-none",
                      isSelected 
                        ? "bg-[#1C253B] border-[#06B6D4] text-[#06B6D4] font-bold shadow-[2px_2px_0px_0px_#111A2E]" 
                        : "bg-[#111A2E] border-[#22314D] text-[#CBD5E1] hover:border-[#33476E] hover:text-[#F8FAFC]"
                    )}
                  >
                    <span className="w-6 h-6 border-2 border-inherit flex items-center justify-center font-bold font-mono shrink-0">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* NAVIGATION CONTROLS */}
            <div className="flex justify-between items-center mt-4">
              <p className="font-mono text-[9px] text-[#94A3B8] uppercase tracking-wide">
                Scores will update on your dashboard profile dynamically.
              </p>

              <PrimaryButton 
                onClick={handleNextOrSubmit}
                icon={<ArrowRight />}
              >
                {currentIdx < questions.length - 1 ? "Next Question" : "Submit Assessment"}
              </PrimaryButton>
            </div>
          </div>

          {/* RIGHT SIDE TIPS */}
          <div className="lg:col-span-4">
            <BrutalistCard variant="accent">
              <h4 className="font-mono text-xs uppercase font-bold text-[#06B6D4] mb-2">// ASSESSMENT INFORMATION</h4>
              <ul className="font-mono text-[10px] text-[#CBD5E1] flex flex-col gap-2.5 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-[#06B6D4]">■</span>
                  <span>You have 60 seconds per question to choose your response.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#06B6D4]">■</span>
                  <span>If the timer runs out, the currently selected option or empty answer is saved.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#06B6D4]">■</span>
                  <span>Detailed answers and explanations are shown at the end of the test.</span>
                </li>
              </ul>
            </BrutalistCard>
          </div>
        </div>
      ) : results ? (
        /* SCORECARD COMPLETED RESULTS */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2">
          {/* STATS SUMMARY CARD */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <BrutalistCard variant="default">
              <span className="font-mono text-xs text-[#06B6D4] font-black uppercase tracking-widest block mb-1">// PRACTICE COMPLETED</span>
              <h3 className="font-sans text-4xl font-black text-[#F8FAFC] tracking-tight mb-2">SCORE: {results.correct} / {results.total}</h3>
              
              <div className="h-0.5 bg-[#22314D] my-4" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-mono text-[10px] text-[#94A3B8] uppercase block">Accuracy Rate</span>
                  <span className="font-mono text-lg font-bold text-[#F8FAFC]">{results.cumulativeAccuracy}%</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-[#94A3B8] uppercase block">Completion Status</span>
                  <span className="font-mono text-lg font-bold text-[#06B6D4]">COMPLETED</span>
                </div>
              </div>

              <PrimaryButton onClick={handleResetPractice} className="w-full mt-6">
                Back to Assessment Setup
              </PrimaryButton>
            </BrutalistCard>
          </div>

          {/* EXPLANATION DRILLDOWNS */}
          <div className="lg:col-span-6">
            <BrutalistCard className="max-h-[500px] overflow-y-auto pr-2" variant="accent">
              <span className="font-mono text-xs text-[#06B6D4] font-black uppercase tracking-widest block mb-3">// SOLUTIONS MATRIX LOGS</span>
              <div className="flex flex-col gap-4 text-left">
                {questions.map((q, qIdx) => {
                  const userAnsIdx = selectedAnswers[q.id];
                  const isCorrect = q.correctIndex === userAnsIdx;

                  return (
                    <div key={q.id} className="p-3 bg-[#090D16] border-l-2 border-[#06B6D4] text-left">
                      <div className="font-mono text-xs font-bold text-[#F8FAFC] mb-2">{qIdx + 1}. {q.questionText}</div>
                      
                      <div className="flex gap-3 text-[10px] font-mono mb-2">
                        <span className={cn(
                          "px-2 py-0.5 border",
                          isCorrect ? "text-emerald-400 border-emerald-950 bg-emerald-950/20" : "text-[#EF4444] border-red-950/60 bg-red-950/20"
                        )}>
                          YOUR RESPONSE: {userAnsIdx !== undefined ? String.fromCharCode(65 + userAnsIdx) : "NONE"}
                        </span>
                        <span className="px-2 py-0.5 border border-emerald-950 text-emerald-400 bg-emerald-950/20">
                          CORRECT ANSWER: {String.fromCharCode(65 + q.correctIndex)}
                        </span>
                      </div>

                      <div className="font-mono text-[10px] text-[#94A3B8] leading-relaxed p-2 bg-[#111A2E] border border-[#22314D]">
                        <span className="font-bold text-[#06B6D4] block mb-1">EXPLANATION:</span>
                        {q.explanation || "No clarification details for this question."}
                      </div>
                    </div>
                  );
                })}
              </div>
            </BrutalistCard>
          </div>
        </div>
      ) : (
        /* INITIAL EMPTY SCREEN */
        <div className="p-8 md:p-16 border-2 border-dashed border-[#22314D] bg-[#111A2E] text-center max-w-3xl mx-auto my-6 flex flex-col items-center gap-6">
          <BookOpen className="w-12 h-12 text-[#06B6D4] mb-2 animate-pulse" />
          <div>
            <h3 className="font-sans text-xl font-black text-[#F8FAFC] mb-2 uppercase">CHOOSE YOUR PREPARATION PATHWAY</h3>
            <p className="font-mono text-xs text-[#94A3B8] max-w-md mx-auto mb-6">
              Ready to practice? Select a pathway to hone your logical, quantitative, and grammar abilities now.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div 
              onClick={() => setIsCompanyMode(false)}
              className={`p-5 text-left border-2 cursor-pointer transition-all ${
                !isCompanyMode 
                  ? "border-[#06B6D4] bg-[#06B6D4]/5" 
                  : "border-[#22314D] bg-[#0D1527] hover:border-[#2D3D5E]"
              }`}
            >
              <span className="font-mono text-[10px] text-[#06B6D4] font-black uppercase tracking-wider block mb-1">01 / SUBJECT DRILLS</span>
              <h4 className="font-sans text-sm font-black text-[#F8FAFC] mb-1">Standard Topic Sets</h4>
              <p className="font-mono text-xs text-[#CBD5E1]">
                Practice targeted Quantitative, Logical, or Verbal questions under continuous countdown timers.
              </p>
            </div>

            <div 
              onClick={() => setIsCompanyMode(true)}
              className={`p-5 text-left border-2 cursor-pointer transition-all ${
                isCompanyMode 
                  ? "border-[#06B6D4] bg-[#06B6D4]/5" 
                  : "border-[#22314D] bg-[#0D1527] hover:border-[#2D3D5E]"
              }`}
            >
              <span className="font-mono text-[10px] text-[#06B6D4] font-black uppercase tracking-wider block mb-1">02 / AI COMPREHENSIVE</span>
              <h4 className="font-sans text-sm font-black text-[#F8FAFC] mb-1">AI Company Mock Tests</h4>
              <p className="font-mono text-xs text-[#CBD5E1]">
                Generate exactly 15 questions representing screening styles from prestigious firms via Gemini.
              </p>
            </div>
          </div>

          {isCompanyMode ? (
            <div className="mt-4 flex flex-col items-center gap-4 w-full max-w-md bg-[#0D1527] border-2 border-[#22314D] p-4 text-left">
              <label className="font-mono text-xs text-[#CBD5E1] font-black uppercase">Select Target Recruiter</label>
              <div className="flex gap-2 w-full">
                <select
                  value={companyName}
                  onChange={(e: any) => setCompanyName(e.target.value)}
                  className="bg-[#111A2E] border-2 border-[#22314D] p-2 text-[#F8FAFC] font-mono text-xs rounded-none cursor-pointer flex-1 outline-hidden focus:border-[#06B6D4]"
                >
                  <option value="Google">Google</option>
                  <option value="McKinsey">McKinsey (PSG)</option>
                  <option value="Goldman Sachs">Goldman Sachs</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Deloitte">Deloitte</option>
                  <option value="TCS">TCS / Infosys</option>
                  <option value="Morgan Stanley">Morgan Stanley</option>
                  <option value="Meta">Meta</option>
                  <option value="Microsoft">Microsoft</option>
                  <option value="JPMorgan">JPMorgan Chase</option>
                  <option value="Custom">Custom Company...</option>
                </select>

                {companyName === "Custom" && (
                  <input
                    type="text"
                    placeholder="E.g. Netflix, Stripe"
                    value={customCompanyText}
                    onChange={(e: any) => setCustomCompanyText(e.target.value)}
                    className="bg-[#111A2E] border-2 border-[#22314D] p-2 text-[#F8FAFC] font-mono text-xs rounded-none outline-hidden focus:border-[#06B6D4] w-1/2"
                  />
                )}
              </div>
              <PrimaryButton onClick={handleStartTest} disabled={loading} className="w-full mt-2">
                {loading ? "Generating 15 Questions with AI..." : "Start Target Assessment"}
              </PrimaryButton>
            </div>
          ) : (
            <div className="mt-4 flex flex-col md:flex-row gap-3 w-full max-w-xl justify-center">
              <select 
                value={category} 
                onChange={(e: any) => setCategory(e.target.value)}
                className="bg-[#111A2E] border-2 border-[#22314D] p-3 text-[#F8FAFC] font-mono text-xs rounded-none cursor-pointer outline-hidden focus:border-[#06B6D4]"
              >
                <option value="quant">QUANTITATIVE APTITUDE</option>
                <option value="logical">LOGICAL REASONING</option>
                <option value="verbal">VERBAL GRAMMAR</option>
              </select>

              <select 
                value={difficulty} 
                onChange={(e: any) => setDifficulty(e.target.value)}
                className="bg-[#111A2E] border-2 border-[#22314D] p-3 text-[#F8FAFC] font-mono text-xs rounded-none cursor-pointer outline-hidden focus:border-[#06B6D4]"
              >
                <option value="easy font-mono">EASY LEVEL</option>
                <option value="medium font-mono">MEDIUM LEVEL</option>
                <option value="hard font-mono">HARD LEVEL</option>
              </select>

              <PrimaryButton onClick={handleStartTest} disabled={loading}>
                {loading ? "Starting Practice..." : "Start Practice Session"}
              </PrimaryButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Help helper
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
