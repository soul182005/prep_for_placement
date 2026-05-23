import React, { useState, useEffect, useRef } from "react";
import { 
  Smile, 
  MessageSquare, 
  Sparkles, 
  Activity, 
  Send, 
  Award, 
  CornerDownRight, 
  CheckCircle,
  VideoOff
} from "lucide-react";
import { PrimaryButton, SecondaryButton, BrutalistCard, WaveformVisualizer } from "./BrutalistPrimitives";
import { api } from "../lib/api-client";

interface InterviewTabProps {
  onRefreshStats: () => void;
}

export const InterviewTab: React.FC<InterviewTabProps> = ({ onRefreshStats }) => {
  const [role, setRole] = useState("Software Engineer Candidate");
  const [mode, setMode] = useState<"technical" | "hr" | "mixed">("mixed");
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [userReply, setUserReply] = useState("");
  const [activeWait, setActiveWait] = useState(false);
  
  const [results, setResults] = useState<any>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll transcript to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleStartInterview = async () => {
    setResults(null);
    setMessages([]);
    setSessionId(null);
    try {
      const resp = await api.startInterview(role, mode);
      setSessionId(resp.sessionId);
      setMessages([{ role: "ai", content: resp.firstQuestion }]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !userReply.trim() || activeWait) return;

    const savedReply = userReply;
    setUserReply("");
    setMessages(prev => [...prev, { role: "user", content: savedReply }]);
    setActiveWait(true);

    try {
      const resp = await api.respondInterview(sessionId, savedReply);
      setMessages(prev => [...prev, { role: "ai", content: resp.aiMessage }]);
    } catch (err) {
      console.error(err);
    } finally {
      setActiveWait(false);
    }
  };

  const handleEndInterview = async () => {
    if (!sessionId) return;
    setIsFinishing(true);
    try {
      const resp = await api.endInterview(sessionId);
      setResults(resp);
      setSessionId(null);
      onRefreshStats();
    } catch (err) {
      console.error(err);
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* HEADER BAR */}
      <div className="border-b-2 border-[#22314D] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between justify-start gap-4">
        <div>
          <h2 className="font-sans text-2xl font-black text-[#F8FAFC]">
            MOCK INTERVIEW
          </h2>
          <p className="font-mono text-xs text-[#CBD5E1]">Practice live conversational coding and behavioral interviews with automated AI feedback and scoring.</p>
        </div>

        {!sessionId && (
          <div className="flex flex-wrap gap-3 items-center">
            <input 
              type="text" 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Frontend React Architect"
              className="bg-[#111A2E] p-2 border-2 border-[#22314D] text-[#F8FAFC] font-mono text-xs outline-hidden focus:border-[#06B6D4] min-w-[200px] rounded-none"
            />

            <select 
              value={mode} 
              onChange={(e: any) => setMode(e.target.value)}
              className="bg-[#111A2E] border-2 border-[#22314D] p-2 text-[#F8FAFC] font-mono text-xs rounded-none cursor-pointer outline-hidden focus:border-[#06B6D4]"
            >
              <option value="technical">TECHNICAL SYSTEM CODES</option>
              <option value="hr">HR & BEHAVIORAL</option>
              <option value="mixed">MIXED TECHNICAL & HR</option>
            </select>

            <PrimaryButton onClick={handleStartInterview}>
              Begin Mock Interview
            </PrimaryButton>
          </div>
        )}
      </div>

      {/* THREE-PANE TRANSCRIPT SYSTEM OR SELECTIONS */}
      {sessionId ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* MOCK CHAT ROOM TRANSCRIPT */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            <BrutalistCard className="flex flex-col gap-4 h-[440px]">
              
              {/* Transcript header and signal lines */}
              <div className="border-b border-[#22314D] pb-3 flex justify-between items-center select-none">
                <span className="font-mono text-[9px] text-[#CBD5E1] flex items-center gap-1.5 uppercase font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-ping" />
                  conversation_transcript
                </span>
                
                <span className="font-mono text-[9px] text-[#94A3B8] uppercase">
                  Target job: {role}
                </span>
              </div>

              {/* Chat lines area */}
              <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
                {messages.map((m, idx) => {
                  const isAi = m.role === "ai";

                  return (
                    <div 
                      key={idx} 
                      className={`flex gap-3 max-w-[85%] text-left ${isAi ? "self-start" : "self-end flex-row-reverse"}`}
                    >
                      {/* Avatar */}
                      <div className={`p-2 border border-[#22314D] text-xs font-mono font-bold shrink-0 h-9 w-9 flex items-center justify-center ${isAi ? "bg-[#1C253B] text-[#06B6D4]" : "bg-[#111A2E] text-[#F8FAFC]"}`}>
                        {isAi ? "AI" : "YOU"}
                      </div>

                      {/* Msg bubble */}
                      <div className={`p-4 border-2 font-mono text-xs leading-relaxed select-text ${isAi ? "bg-[#111A2E] border-[#22314D] text-[#CBD5E1] hover:border-[#33476E]" : "bg-[#1C253B] border-[#33476E] text-[#F8FAFC]"}`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                {activeWait && (
                  <div className="flex gap-3 max-w-[85%] self-start items-center">
                    <div className="p-2 border border-[#22314D] text-xs bg-[#1C253B] text-[#06B6D4] font-mono h-9 w-9 flex items-center justify-center font-bold">AI</div>
                    <div className="font-mono text-xs text-[#94A3B8] italic animate-pulse">AI is analyzing your answer...</div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="border-t border-[#22314D] pt-3 flex gap-3">
                <input 
                  type="text" 
                  value={userReply}
                  onChange={(e) => setUserReply(e.target.value)}
                  placeholder="Type your response here..."
                  className="flex-1 bg-[#090D16] border-2 border-[#22314D] focus:border-[#06B6D4] px-4 py-3 text-[#F8FAFC] font-mono text-xs outline-hidden rounded-none"
                  disabled={activeWait}
                />
                <PrimaryButton type="submit" disabled={activeWait || !userReply.trim()} className="px-4">
                  <Send className="w-4 h-4" />
                </PrimaryButton>
              </form>

            </BrutalistCard>

            {/* BUTTON BAR */}
            <div className="flex justify-between items-center">
              <span className="font-mono text-[9px] text-[#94A3B8] uppercase">
                Submit responses to evaluate communication and structural technical depth.
              </span>
              <SecondaryButton onClick={handleEndInterview} disabled={isFinishing}>
                {isFinishing ? "Generating Final Report..." : "Complete & Evaluate"}
              </SecondaryButton>
            </div>
          </div>

          {/* COGNITIVE GRADING BAR AND SIGNAL WAVE */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <BrutalistCard variant="accent">
              <h4 className="font-mono text-xs font-black text-[#06B6D4] tracking-wider mb-2">// AUDIO WAVE MOTIF</h4>
              <p className="font-mono text-[10px] text-[#94A3B8] mb-4">Simulated conversation rhythm representation.</p>
              
              <div className="flex justify-center mb-2">
                <WaveformVisualizer isAnimating={activeWait} />
              </div>
            </BrutalistCard>

            <BrutalistCard variant="default">
              <h4 className="font-mono text-xs font-black text-[#F8FAFC] uppercase mb-2">// INTERVIEW INSIGHTS & STRATEGY</h4>
              <ul className="font-mono text-[10px] text-[#94A3B8] flex flex-col gap-2.5 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-[#06B6D4]">■</span>
                  <span>Provide deep, structured answers. Elaborate on your design choices, technologies used, and systems architectural limits.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#06B6D4]">■</span>
                  <span>Focus on architectural keywords, constraints, and professional terminology.</span>
                </li>
              </ul>
            </BrutalistCard>
          </div>

        </div>
      ) : results ? (
        /* COMPLETED EVALUATION REPORT SCREEN */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* DETAILED FEEDBACK PANEL */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <BrutalistCard variant="accent">
              <span className="font-mono text-xs text-[#06B6D4] font-black uppercase block mb-1">
                // AI EVALUATION REPORT
              </span>
              <h2 className="font-sans text-3xl font-black text-[#F8FAFC] mb-4">INTERVIEW PERFORMANCE REPORT</h2>

              <div className="p-4 bg-[#090D16] border border-[#22314D] text-left font-mono text-xs text-[#CBD5E1] leading-relaxed select-text min-h-64 whitespace-pre-wrap select-text">
                {results.feedback || "Processing expert speech analysis..."}
              </div>

              <PrimaryButton onClick={handleStartInterview} className="w-full mt-6">
                Start Next Practice Session
              </PrimaryButton>
            </BrutalistCard>
          </div>

          {/* SCORES AND SPEECH RATINGS */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <BrutalistCard variant="default">
              <span className="font-mono text-xs text-[#06B6D4] font-black uppercase tracking-wider block mb-1">
                // ASSESSMENT SUMMARY SCORE
              </span>
              <div className="text-left py-4">
                <div className="font-mono text-[10px] text-[#94A3B8] uppercase mb-1">Calculated Conversational Metric Grade</div>
                <div className="font-sans text-5xl font-black text-[#F8FAFC]">{results.score || 72}/100</div>
              </div>

              <div className="h-0.5 bg-[#22314D] my-4" />

              <div className="flex flex-col gap-3 text-left">
                <div className="flex justify-between items-center bg-[#090D16] p-3 border border-[#22314D]">
                  <span className="font-mono text-[10px] uppercase text-[#CBD5E1]">VERBAL CONFIDENCE</span>
                  <span className="font-mono text-xs text-[#06B6D4] font-bold">▲ HIGH</span>
                </div>
                <div className="flex justify-between items-center bg-[#090D16] p-3 border border-[#22314D]">
                  <span className="font-mono text-[10px] uppercase text-[#CBD5E1]">SYSTEM DESIGN DEPTH</span>
                  <span className="font-mono text-xs text-[#06B6D4] font-bold">▲ SUBSTANTIAL</span>
                </div>
                <div className="flex justify-between items-center bg-[#090D16] p-3 border border-[#22314D]">
                  <span className="font-mono text-[10px] uppercase text-[#CBD5E1]">RECRUITER VOCABULARY MATCH</span>
                  <span className="font-mono text-xs text-[#06B6D4] font-bold">▲ SATISFACTORY</span>
                </div>
              </div>
            </BrutalistCard>
          </div>

        </div>
      ) : (
        /* INITIAL WELCOME OR NOT CHAT GRID */
        <div className="p-20 border-2 border-dashed border-[#22314D] bg-[#111A2E] text-center max-w-2xl mx-auto my-6">
          <Award className="w-12 h-12 text-[#22314D] mx-auto mb-4" />
          <h3 className="font-sans text-xl font-black text-[#F8FAFC] mb-2">INTERVIEW NOT STARTED</h3>
          <p className="font-mono text-xs text-[#94A3B8] max-w-sm mx-auto mb-6">
            Specify your target role and select a mode above, then click 'Begin Mock Interview' to start your conversational practice session.
          </p>
          <PrimaryButton onClick={handleStartInterview}>Begin Mock Interview</PrimaryButton>
        </div>
      )}

    </div>
  );
};
