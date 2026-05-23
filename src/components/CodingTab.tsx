import React, { useState, useEffect } from "react";
import { 
  Play, 
  Sparkles, 
  Cpu, 
  HelpCircle, 
  BookOpen, 
  CornerDownRight, 
  Terminal, 
  CheckCircle, 
  AlertTriangle 
} from "lucide-react";
import { PrimaryButton, SecondaryButton, BrutalistCard, cn } from "./BrutalistPrimitives";
import { CodingProblem } from "../types";
import { api } from "../lib/api-client";

interface CodingTabProps {
  onRefreshStats: () => void;
}

export const CodingTab: React.FC<CodingTabProps> = ({ onRefreshStats }) => {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [selectedProb, setSelectedProb] = useState<CodingProblem | null>(null);
  
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  
  const [language, setLanguage] = useState<string>("javascript");
  const [codeBuffer, setCodeBuffer] = useState<string>("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string>("");
  const [runResult, setRunResult] = useState<any>(null);

  const [aiFeedback, setAiFeedback] = useState<string>("");
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [aiMode, setAiMode] = useState<"hint" | "review">("hint");

  // Fetch problems on mount or filter change
  useEffect(() => {
    async function loadProblems() {
      try {
        const t = topicFilter === "all" ? "" : topicFilter;
        const d = difficultyFilter === "all" ? "" : difficultyFilter;
        const resp = await api.getCodingProblems(t, d);
        if (resp.problems) {
          setProblems(resp.problems);
          if (resp.problems.length > 0 && !selectedProb) {
            handleSelectProblem(resp.problems[0]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadProblems();
  }, [topicFilter, difficultyFilter]);

  const handleSelectProblem = (prob: CodingProblem) => {
    setSelectedProb(prob);
    setConsoleOutput("");
    setRunResult(null);
    setAiFeedback("");

    // Look for starter code templates inside the problem JSON mapping if present
    try {
      if (prob.starterCode) {
        const templates = JSON.parse(prob.starterCode);
        setCodeBuffer(templates[language] || templates["javascript"] || "");
      } else {
        setCodeBuffer("// Start coding here...\nfunction solve() {\n  \n}");
      }
    } catch {
      setCodeBuffer("// Write algorithmic solution inside here...\n");
    }
  };

  // Synchronize code templates on language changes
  useEffect(() => {
    if (selectedProb) {
      try {
        const templates = JSON.parse(selectedProb.starterCode);
        if (templates[language]) {
          setCodeBuffer(templates[language]);
        }
      } catch {
        // Fallback
      }
    }
  }, [language]);

  const handleRunCode = async () => {
    if (!selectedProb) return;
    setIsCompiling(true);
    setConsoleOutput("Compiling files & launching sandbox container...");
    setRunResult(null);
    try {
      const resp = await api.runCode(selectedProb.id, codeBuffer, language);
      setConsoleOutput(resp.output);
      setRunResult(resp);

      // Save submission state to DB if passed
      if (resp.passed) {
        await api.saveCodingSession(selectedProb.id, codeBuffer, language, "solved");
        onRefreshStats();
      } else {
        await api.saveCodingSession(selectedProb.id, codeBuffer, language, "attempted");
      }
    } catch (err: any) {
      setConsoleOutput(`✕ COMPILATION ERROR: ${err.message || "Execution engine timeout."}`);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleAskAI = async (mode: "hint" | "review") => {
    if (!selectedProb) return;
    setIsAskingAI(true);
    setAiMode(mode);
    setAiFeedback("Consulting Placement AI Advisor...");
    try {
      const resp = await api.getCodeFeedback(selectedProb.id, codeBuffer, language, mode === "hint");
      setAiFeedback(resp.feedback);
    } catch (err: any) {
      setAiFeedback(`Failed communicating with AI service: ${err.message || "Error"}`);
    } finally {
      setIsAskingAI(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left items-start">
      
      {/* LEFT PORTION: FILTERS, PROBLEM SELECTOR & CHOSEN DESCRIPTION (lg:col-span-5) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <BrutalistCard variant="default" className="flex flex-col gap-4">
          <div className="border-b border-[#22314D] pb-3 flex justify-between items-center">
            <div>
              <span className="font-mono text-[9px] uppercase font-black text-[#06B6D4]">// PRACTICE SUITE</span>
              <h2 className="font-sans text-lg font-black text-[#F8FAFC]">CODING CHALLENGES</h2>
            </div>
            <span className="font-mono text-[9px] text-[#94A3B8] font-bold bg-[#1C253B] border border-[#22314D] px-2 py-0.5 uppercase">
              {problems.length} Curated
            </span>
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-2 gap-2">
            <select 
              value={topicFilter} 
              onChange={(e) => setTopicFilter(e.target.value)}
              className="w-full bg-[#111A2E] border-2 border-[#22314D] p-2 text-[#CBD5E1] font-mono text-xs outline-hidden cursor-pointer focus:border-[#06B6D4]"
            >
              <option value="all">ALL TOPICS</option>
              <option value="dsa">DATA STRUCTURES</option>
              <option value="algorithms">ALGORITHMS</option>
              <option value="strings">STRINGS HANDLING</option>
            </select>

            <select 
              value={difficultyFilter} 
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full bg-[#111A2E] border-2 border-[#22314D] p-2 text-[#CBD5E1] font-mono text-xs outline-hidden cursor-pointer focus:border-[#06B6D4]"
            >
              <option value="all">ALL DIFFICULTIES</option>
              <option value="easy">EASY</option>
              <option value="medium">MEDIUM</option>
              <option value="hard">HARD</option>
            </select>
          </div>

          {/* Clean Challenge Dropdown selector */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[9px] uppercase text-[#06B6D4] font-bold tracking-wider">// SELECT ACTIVE CHALLENGE</label>
            <select
              value={selectedProb?.id || ""}
              onChange={(e) => {
                const found = problems.find(p => p.id === e.target.value);
                if (found) {
                  handleSelectProblem(found);
                }
              }}
              className="w-full bg-[#090D16] border-2 border-[#06B6D4] p-3 text-[#F8FAFC] font-mono text-xs outline-hidden cursor-pointer focus:border-[#06B6D4] font-bold"
            >
              {problems.map((prob) => (
                <option key={prob.id} value={prob.id}>
                  {prob.title} — {prob.difficulty.toUpperCase()} ({prob.topic.toUpperCase()})
                </option>
              ))}
              {problems.length === 0 && <option value="">No matches. Adjust filters above.</option>}
            </select>
          </div>
        </BrutalistCard>

        {selectedProb ? (
          <>
            <BrutalistCard variant="accent">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] text-[#06B6D4] tracking-wider uppercase">
                  // PROBLEM STATEMENT
                </span>
                <span className={cn(
                  "text-[8px] px-1.5 py-0.5 border uppercase font-mono font-bold",
                  selectedProb.difficulty === "easy" ? "border-emerald-900 text-emerald-400 bg-emerald-950/20" :
                  selectedProb.difficulty === "medium" ? "border-amber-950 text-amber-500 bg-amber-950/20" :
                  "border-[#22314D] text-[#06B6D4] bg-[#1C253B]"
                )}>
                  {selectedProb.difficulty}
                </span>
              </div>
              <h3 className="font-sans text-xl font-black text-[#F8FAFC] mb-3">{selectedProb.title}</h3>

              <div className="font-mono text-[11px] text-[#CBD5E1] leading-relaxed whitespace-pre-wrap select-text max-h-[300px] overflow-y-auto pr-2 bg-[#090D16] p-3 border border-[#22314D]">
                {selectedProb.description}
              </div>

              {/* TESTCASES ACCENT */}
              <div className="mt-4 border-t border-[#22314D] pt-3">
                <span className="font-mono text-[9px] uppercase text-[#94A3B8] block mb-2">Example Test Cases</span>
                {(() => {
                  try {
                    const cases = JSON.parse(selectedProb.testCases);
                    return cases.map((tc: any, tcIdx: number) => (
                      <div key={tcIdx} className="bg-[#090D16] border border-[#22314D] p-2 font-mono text-[10px] text-[#94A3B8] mb-1.5">
                        <span className="text-[#06B6D4] font-bold">CASE {tcIdx + 1}:</span> Input: <code className="text-[#F8FAFC]">{tc.input}</code> ➔ Expected: <code className="text-[#F8FAFC]">{tc.expectedOutput}</code>
                      </div>
                    ));
                  } catch {
                    return null;
                  }
                })()}
              </div>
            </BrutalistCard>

            {/* AI ADVISORY RESPONSIVE PANEL */}
            {aiFeedback && (
              <div className="p-4 border-2 border-[#06B6D4]/50 bg-[#0B1528] text-left relative">
                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#06B6D4] border-b border-l border-[#F8FAFC]"></div>
                <h4 className="font-mono text-[10px] text-[#06B6D4] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" /> 
                  AI CODESPACE ADVISOR ({aiMode.toUpperCase()})
                </h4>
                <div className="font-mono text-[10px] text-[#CBD5E1] leading-relaxed max-h-[160px] overflow-y-auto pr-1 whitespace-pre-wrap select-text">
                  {aiFeedback}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* RIGHT PORTION: EDITOR & LIVE TERMINAL PLAYGROUND (lg:col-span-7) */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {selectedProb ? (
          <>
            {/* EDITOR CONTROLLER */}
            <div className="flex items-center justify-between border-b border-[#22314D] pb-3">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-[#111A2E] border-2 border-[#22314D] p-1.5 text-[#F8FAFC] font-mono text-xs rounded-none cursor-pointer outline-hidden focus:border-[#06B6D4]"
              >
                <option value="javascript">JAVASCRIPT (Node.js)</option>
                <option value="typescript">TYPESCRIPT (v5.1)</option>
                <option value="python">PYTHON (v3.10)</option>
                <option value="cpp">C++ (GCC 12)</option>
                <option value="java">JAVA (OpenJDK 21)</option>
                <option value="csharp">C# (.NET Core)</option>
                <option value="go">GO (v1.20)</option>
                <option value="rust">RUST (v1.72)</option>
                <option value="ruby">RUBY (v3.2)</option>
                <option value="swift">SWIFT (v5.9)</option>
                <option value="kotlin">KOTLIN (v1.9)</option>
              </select>

              <div className="flex gap-2">
                <SecondaryButton 
                  onClick={() => handleAskAI("hint")} 
                  disabled={isAskingAI}
                  className="px-3 py-1.5 text-xs scale-90"
                >
                  Get Hint
                </SecondaryButton>
                <SecondaryButton 
                  onClick={() => handleAskAI("review")} 
                  disabled={isAskingAI}
                  className="px-3 py-1.5 text-xs scale-90"
                >
                  Review Code
                </SecondaryButton>
              </div>
            </div>

            {/* LIVE EDITOR CANVAS */}
            <div className="relative border-2 border-[#22314D] bg-[#111A2E]">
              {/* Fake Compiler Header bar */}
              <div className="bg-[#1C253B] p-2 flex items-center justify-between border-b border-[#111A2E]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#162238]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1f2b45]" />
                </div>
                <span className="font-mono text-[9px] uppercase text-[#CBD5E1] tracking-widest block font-bold leading-none">
                  editor_workspace
                </span>
                <Cpu className="w-3.5 h-3.5 text-[#06B6D4]" />
              </div>

              {/* Real Editable text space with faked line markers */}
              <div className="flex">
                {/* Simulated line indexing gutter */}
                <div className="bg-[#090D16] px-2 py-4 select-none border-r border-[#22314D] text-right font-mono text-[10px] text-[#2d3a52] flex flex-col gap-0.5 min-w-8">
                  {Array.from({ length: Math.max(16, codeBuffer.split("\n").length + 2) }).map((_, idx) => (
                    <div key={idx}>{idx + 1}</div>
                  ))}
                </div>

                <textarea
                  value={codeBuffer}
                  onChange={(e) => setCodeBuffer(e.target.value)}
                  className="w-full h-80 bg-transparent p-4 text-[#F8FAFC] font-mono text-xs outline-hidden resize-none rounded-none"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* EDITOR CONTROLS FOOTER */}
            <div className="flex justify-between items-center bg-[#090D16] p-3 border border-[#22314D]">
              <span className="font-mono text-[9px] text-[#94A3B8] uppercase tracking-wide">
                Practicing codespace automatically validates syntax and logic.
              </span>

              <PrimaryButton 
                onClick={handleRunCode} 
                disabled={isCompiling}
                icon={<Play />}
              >
                {isCompiling ? "Running tests..." : "Run Test Suite"}
              </PrimaryButton>
            </div>

            {/* RUN TESTS TERMINAL OUTPUT */}
            <div className="border-2 border-[#22314D] bg-[#090D16] p-4 text-left font-mono text-xs">
              <span className="text-[#06B6D4] font-bold block mb-2">➔ TERMINAL OUTPUT / RESULTS:</span>
              
              <div className="max-h-36 overflow-y-auto pr-1 whitespace-pre-wrap bg-[#111A2E] p-3 border border-[#22314D]">
                {consoleOutput || "No test cases executed yet."}
              </div>

              {runResult && (
                <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
                  <div className="p-2 border border-[#22314D] flex items-center gap-2">
                    {runResult.passed ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-400 font-bold uppercase">SUCCESS: PASSED</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-[#06B6D4] shrink-0" />
                        <span className="text-[#06B6D4] font-bold uppercase">FAILED: TEST CASES MISSED</span>
                      </>
                    )}
                  </div>
                  <div className="p-2 border border-[#22314D] text-right">
                    ROLLING PROGRESS UPDATE: <span className="font-black text-[#06B6D4]">{runResult.passed ? "Updated" : "N/C"}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-20 border-2 border-dashed border-[#22314D] bg-[#111A2E] text-center">
            <Cpu className="w-12 h-12 text-[#22314D] mx-auto mb-4" />
            <h3 className="font-sans text-xl font-black text-[#F8FAFC] mb-2">CHALLENGE NOT SELECTED</h3>
            <p className="font-mono text-xs text-[#94A3B8]">Select a coding exercise from the sidebar to start writing your solution.</p>
          </div>
        )}
      </div>

    </div>
  );
};
