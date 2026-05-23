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
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Bot,
  HelpCircle,
  RefreshCw,
  TrendingUp,
  User,
  AlertTriangle,
  Lightbulb,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PrimaryButton, SecondaryButton, BrutalistCard, WaveformVisualizer } from "./BrutalistPrimitives";
import { api } from "../lib/api-client";

interface InterviewTabProps {
  onRefreshStats: () => void;
}

export const InterviewTab: React.FC<InterviewTabProps> = ({ onRefreshStats }) => {
  // Config state
  const [role, setRole] = useState("Software Engineer Candidate");
  const [mode, setMode] = useState<"technical" | "hr" | "mixed">("mixed");
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Audio / Speech State
  const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [autoTtsEnabled, setAutoTtsEnabled] = useState(true);
  const [audioError, setAudioError] = useState("");
  const [showTextFallback, setShowTextFallback] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Messages state
  const [messages, setMessages] = useState<any[]>([]);
  const [userReply, setUserReply] = useState("");
  const [activeWait, setActiveWait] = useState(false);
  
  // Results / Scorecard state
  const [results, setResults] = useState<any>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  
  // AI Prep Coach Chatbot State
  const [coachMessages, setCoachMessages] = useState<any[]>([]);
  const [coachInput, setCoachInput] = useState("");
  const [isCoachTyping, setIsCoachTyping] = useState(false);
  const [coachError, setCoachError] = useState("");

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const coachBottomRef = useRef<HTMLDivElement | null>(null);

  // Check if Web Speech API is supported on mount
  useEffect(() => {
    setIsSpeechSupported(!!SpeechRecognitionAPI);
  }, []);

  // Auto scroll normal chat transcripts & coach chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isRecording, userReply]);

  useEffect(() => {
    if (coachBottomRef.current) {
      coachBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [coachMessages, isCoachTyping]);

  // Audio synthesis helper (Text-to-Speech)
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      // Clean up symbols and markdown for cleaner reader speech
      const cleanText = text
        .replace(/\[.*?\]/g, "")
        .replace(/\*\*|##|---|#|\*/g, "")
        .trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      // Prefer standard Google or English voices
      const selectedVoice = voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")) ||
                            voices.find(v => v.lang.startsWith("en")) ||
                            voices[0];
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = 1.02;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis error or blocked by policy:", err);
    }
  };

  // Automated reading aloud of new AI questions during the interview
  useEffect(() => {
    if (messages.length > 0 && autoTtsEnabled) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "ai") {
        speakText(lastMsg.content);
      }
    }
  }, [messages, autoTtsEnabled]);

  // Initialize Prep Coach when interview results are available
  useEffect(() => {
    if (results) {
      setCoachMessages([
        {
          role: "coach",
          content: `Hello! I am your AI Placement Coach. 🌟

I have evaluated your performance report for the '${role}' role mock round. Your overall score is **${results.score || 72}/100**.

I have loaded your report card, including details such as your extracted strengths and areas needing database, runtime, or architectural improvements.

Type your questions below, or click any suggested prep strategy to begin strengthening your placement interview performance!`
        }
      ]);
    }
  }, [results]);

  // Command handlers - Speech Recognition
  const startSpeechCapture = () => {
    if (!SpeechRecognitionAPI) {
      setAudioError("Microphone speech recognition is not supported in this browser. Please use simulation options or text fallback.");
      return;
    }

    setAudioError("");
    setUserReply("");
    try {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        const textStr = finalTranscript || interimTranscript;
        if (textStr) {
          setUserReply(textStr);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Capture Error:", e);
        if (e.error === "not-allowed") {
          setAudioError("Microphone access was denied or restricted. Please allow mic usage or type simulated answer below.");
        } else {
          setAudioError(`Microphone input status: ${e.error}`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.error(err);
      setAudioError("Failed to initialize system recording components.");
      setIsRecording(false);
    }
  };

  const stopSpeechCapture = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Failed to stop SpeechRecognition safely", err);
      }
    }
    setIsRecording(false);
  };

  // Actions
  const handleStartInterview = async () => {
    setResults(null);
    setMessages([]);
    setSessionId(null);
    setUserReply("");
    setAudioError("");
    setCoachMessages([]);
    try {
      const resp = await api.startInterview(role, mode);
      setSessionId(resp.sessionId);
      setMessages([{ role: "ai", content: resp.firstQuestion }]);
    } catch (err) {
      console.error(err);
    }
  };

  const submitAudioMessage = async () => {
    if (!sessionId || !userReply.trim() || activeWait) return;
    
    // Safety check - stop recording
    if (isRecording) {
      stopSpeechCapture();
    }

    const replyBuffer = userReply;
    setUserReply("");
    setMessages(prev => [...prev, { role: "user", content: replyBuffer }]);
    setActiveWait(true);

    try {
      const resp = await api.respondInterview(sessionId, replyBuffer);
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
    if (isRecording) {
      stopSpeechCapture();
    }
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

  // Prep Coach response dispatcher
  const submitCoachPrompt = async (promptText: string) => {
    if (!promptText.trim() || isCoachTyping || !results) return;

    setCoachError("");
    const updatedHistory = [...coachMessages, { role: "user", content: promptText }];
    setCoachMessages(updatedHistory);
    setCoachInput("");
    setIsCoachTyping(true);

    try {
      const resp = await api.getInterviewCoach(role, mode, results.feedback, updatedHistory);
      setCoachMessages(prev => [...prev, { role: "coach", content: resp.reply }]);
    } catch (err: any) {
      setCoachError("Coaching agent failed to respond. Let's retry.");
      console.error(err);
    } finally {
      setIsCoachTyping(false);
    }
  };

  // Helper spoken interview templates to make simulation fun & sandbox-independent!
  const loadSpokenSample = (type: "tech1" | "tech2" | "hr1") => {
    const samples = {
      tech1: "A balanced Binary Search Tree guarantees O(log N) runtime search and insertion operations, whereas a Hashmap provides O(1) constant complexity on average but can degenerate to linear O(N) when bucket chaining occurs.",
      tech2: "In my recent system design project, we selected PostgreSQL for structured profile storage due to transactional integrity, then cached volatile analytical count tables dynamically inside a Redis cluster.",
      hr1: "I resolved an operational technical bottleneck during my internship by coordinating visual updates across the team and setting up detailed monitoring dashboards to track background job failures."
    };
    setUserReply(samples[type]);
    setAudioError("");
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* HEADER BAR */}
      <div className="border-b-2 border-[#22314D] pb-5 flex flex-col md:flex-row md:items-center md:justify-between justify-start gap-4">
        <div>
          <h2 className="font-sans text-2xl font-black text-[#F8FAFC]">
            MOCK INTERVIEW PANEL
          </h2>
          <p className="font-mono text-xs text-[#CBD5E1]">
            Practice speech-driven mock rounds. AI transcribes your spoken answers, scores technical depths and provides constructive coaching.
          </p>
        </div>

        {!sessionId && !results && (
          <div className="flex flex-wrap gap-3 items-center">
            <input 
              type="text" 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Frontend React Architect"
              className="bg-[#111A2E] p-2.5 border-2 border-[#22314D] text-[#F8FAFC] font-mono text-xs outline-hidden focus:border-[#06B6D4] min-w-[200px] rounded-none"
            />

            <select 
              value={mode} 
              onChange={(e: any) => setMode(e.target.value)}
              className="bg-[#111A2E] border-2 border-[#22314D] p-2.5 text-[#F8FAFC] font-mono text-xs rounded-none cursor-pointer outline-hidden focus:border-[#06B6D4]"
            >
              <option value="technical">TECHNICAL PRACTICE</option>
              <option value="hr">BEHAVIORAL & HR</option>
              <option value="mixed">MIXED PLACEMENT ROUND</option>
            </select>

            <PrimaryButton onClick={handleStartInterview}>
              Begin Voice Interview
            </PrimaryButton>
          </div>
        )}

        {(sessionId || results) && (
          <SecondaryButton 
            onClick={() => {
              setSessionId(null);
              setResults(null);
              setMessages([]);
              setCoachMessages([]);
            }}
          >
            🔒 Exit & Back to Config
          </SecondaryButton>
        )}
      </div>

      {/* ACTIVE MOCK INTERVIEW SCREEN (AUDIO DRIVEN) */}
      {sessionId ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* DIALOG TRANSCRIPT PANEL */}
          <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-4">
            
            <BrutalistCard className="flex flex-col gap-4 min-h-[460px] max-h-[500px]">
              
              <div className="border-b border-[#22314D] pb-3 flex flex-wrap justify-between items-center gap-2 select-none">
                <span className="font-mono text-[10px] text-[#06B6D4] flex items-center gap-1.5 uppercase font-bold">
                  <span className="w-2   h-2 rounded-full bg-[#06B6D4] animate-ping" />
                  AUDIO MODE: VOICE RESPONSE SCANNER
                </span>
                
                <div className="flex items-center gap-3">
                  {/* AUTO READ CHECK */}
                  <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[9px] text-[#94A3B8] uppercase select-none hover:text-[#F8FAFC]">
                    <input 
                      type="checkbox" 
                      checked={autoTtsEnabled}
                      onChange={(e) => setAutoTtsEnabled(e.target.checked)}
                      className="accent-[#06B6D4]"
                    />
                    🔊 AUTO-READ QUESTION
                  </label>
                  
                  <span className="font-mono text-[9px] text-zinc-500 uppercase">
                    ROLE: {role}
                  </span>
                </div>
              </div>

              {/* CHAT LOG TRANSCRIPT */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 max-h-[290px]">
                {messages.map((m, idx) => {
                  const isAi = m.role === "ai";

                  return (
                    <div 
                      key={idx} 
                      className={`flex gap-3 max-w-[90%] text-left ${isAi ? "self-start" : "self-end flex-row-reverse"}`}
                    >
                      {/* Speaker Tag */}
                      <div className={`p-2 border border-[#22314D] text-xs font-mono font-bold shrink-0 h-9 w-9 flex items-center justify-center ${isAi ? "bg-[#1C253B] text-[#06B6D4]" : "bg-[#111A2E] text-emerald-400"}`}>
                        {isAi ? "AI" : "YOU"}
                      </div>

                      {/* Content Bubble */}
                      <div className={`relative p-3.5 border-2 font-mono text-xs leading-relaxed select-text ${
                        isAi 
                          ? "bg-[#111A2E] border-[#22314D] text-[#CBD5E1]" 
                          : "bg-[#1C253B] border-emerald-500/40 text-[#F8FAFC]"
                      }`}>
                        {m.content}
                        
                        {/* Audio play trigger for AI question */}
                        {isAi && (
                          <button
                            type="button"
                            onClick={() => speakText(m.content)}
                            title="Speak question aloud"
                            className="absolute -bottom-2 -right-2 bg-[#1C253B] border border-[#33476E] hover:border-[#06B6D4] p-1 text-[#06B6D4] hover:text-[#22D3EE] transition"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {activeWait && (
                  <div className="flex gap-3 max-w-[85%] self-start items-center">
                    <div className="p-2 border border-[#22314D] text-xs bg-[#1C253B] text-[#06B6D4] font-mono h-9 w-9 flex items-center justify-center font-bold">AI</div>
                    <div className="font-mono text-xs text-[#94A3B8] italic animate-pulse">Analyzing transcript logs. Formulating follow-up query...</div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* TRANSCRIPTION RESULT DRAFT */}
              {userReply.trim() && (
                <div className="border border-emerald-500/20 bg-emerald-500/5 p-3 rounded-none">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">🗣️ Transcript Preview (Recognized Spoken Text)</span>
                    <button 
                      type="button" 
                      onClick={() => setUserReply("")}
                      className="font-mono text-[9px] text-[#94A3B8] hover:text-[#EF4444]"
                    >
                      Clear Spoken response
                    </button>
                  </div>
                  <p className="font-mono text-xs text-[#F8FAFC] leading-relaxed italic">
                    "{userReply}"
                  </p>
                </div>
              )}

              {/* AUDIO INTERACTIVE CONSOLE BLOCK */}
              <div className="border-t-2 border-[#22314D] pt-3.5 flex flex-col gap-3 bg-[#090D16] p-3 border border-[#1C253B]">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  
                  {/* DYNAMIC SPEECH CAPTURE INDICATOR */}
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 animate-pulse rounded-full border ${isRecording ? "bg-red-500" : "bg-[#22314D]"}`} />
                    <span className="font-mono text-[10px] text-[#F8FAFC] uppercase tracking-wider">
                      {isRecording ? "🔴 Capturing Microphones Live" : "🎤 AUDIO STANDBY. PRESS SPEAK BELOW"}
                    </span>
                  </div>

                  {/* VISUAL WAVEFORM INDICATOR */}
                  <div className="w-48 overflow-hidden max-h-10 border border-[#22314D]">
                    <WaveformVisualizer isAnimating={isRecording} />
                  </div>
                </div>

                {/* CONTROL BUTTON PANEL */}
                <div className="flex flex-wrap gap-2.5 items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {!isRecording ? (
                      <PrimaryButton 
                        onClick={startSpeechCapture}
                        className="py-1.5 px-4 bg-red-600 shadow-[2px_2px_0px_0px_#22314D]"
                      >
                        🎤 Speak My Answer
                      </PrimaryButton>
                    ) : (
                      <PrimaryButton 
                        onClick={stopSpeechCapture}
                        className="py-1.5 px-4 bg-emerald-600 text-white font-bold"
                      >
                        ⏹️ Done Speaking
                      </PrimaryButton>
                    )}

                    <SecondaryButton 
                      onClick={submitAudioMessage}
                      disabled={!userReply.trim() || activeWait}
                      className="py-1.5 px-4 border-emerald-500/50 hover:bg-emerald-950/20"
                    >
                      🚀 Send Spoken Voice Answer
                    </SecondaryButton>
                  </div>

                  <span className="font-mono text-[10px] text-[#94A3B8]">
                    No typing allowed. Practice like a real conversational round!
                  </span>
                </div>
                
                {audioError && (
                  <div className="p-2 bg-red-950/40 border border-[#EF4444] text-[#F8FAFC] font-mono text-[10px]">
                    ⚠️ {audioError}
                  </div>
                )}
              </div>

            </BrutalistCard>

            {/* ACTION FOOTER BAR */}
            <div className="flex flex-wrap md:flex-row justify-between items-center gap-3">
              <span className="font-mono text-[10px] text-[#94A3B8]">
                Click 'Complete & Evaluate' once you are ready to stop mock testing and active coaching module.
              </span>
              <SecondaryButton onClick={handleEndInterview} disabled={isFinishing}>
                {isFinishing ? "Assembling Coaching Report..." : "Complete & Evaluate"}
              </SecondaryButton>
            </div>
          </div>

          {/* AUDIO SIMULATION COMPONENT RAIL & STUDY HELPERS */}
          <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-4">
            
            <BrutalistCard variant="accent" className="border-rose-500/40">
              <span className="font-mono text-[9px] text-rose-400 font-extrabold tracking-widest block uppercase mb-1">
                ⚠️ MICROPHONE & SANDBOX BROWSER NOTICE
              </span>
              <h4 className="font-mono text-xs font-black text-rose-400 uppercase mb-2">Why is raw microphone access blocked?</h4>
              
              <div className="font-mono text-[10px] text-[#CBD5E1] space-y-2 mb-4 leading-relaxed">
                <p>
                  Most browsers prevent recording device authorization inside nested iframe development previews to protect candidate security.
                </p>
                <div className="p-2 border border-rose-500/20 bg-rose-500/5 text-[#CBD5E1]">
                  <strong>💡 Two ways to test/simulate the round:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Click <strong className="text-[#06B6D4]">"Open in a new tab"</strong> at the top right of this preview container, where real voice recording works without iframe restrictions.</li>
                    <li>Or, use our <strong>Speech Simulation presets</strong> or <strong>keyboard text bypass controls</strong> below.</li>
                  </ul>
                </div>
              </div>

              <span className="font-mono text-[9px] text-[#06B6D4] font-bold uppercase tracking-wider block mb-2">⚡ SIMULATE COMPLETED SPOKEN ANSWERS</span>
              
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    loadSpokenSample("tech1");
                    // Automatically focus or alert that text is loaded
                  }}
                  className="w-full text-left bg-[#111A2E] border-2 border-[#22314D] hover:border-emerald-500 hover:bg-emerald-500/5 p-2.5 font-mono text-[10px] text-[#F8FAFC] transition group flex items-start gap-2"
                >
                  <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-1 py-0.5 text-[8px] uppercase shrink-0 mt-0.5">TECHNICAL</span>
                  <div className="flex-1">
                    <span className="font-bold text-emerald-400 block group-hover:underline">Tree vs Hashmap</span>
                    <span className="text-[9px] text-[#94A3B8] block mt-0.5 line-clamp-1">A balanced Binary Search Tree guarantees O(log N) runtime search and insertion...</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => loadSpokenSample("tech2")}
                  className="w-full text-left bg-[#111A2E] border-2 border-[#22314D] hover:border-[#06B6D4] hover:border-cyan-500 hover:bg-cyan-500/5 p-2.5 font-mono text-[10px] text-[#F8FAFC] transition group flex items-start gap-2"
                >
                  <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold px-1 py-0.5 text-[8px] uppercase shrink-0 mt-0.5">ARCHITECTURE</span>
                  <div className="flex-1">
                    <span className="font-bold text-cyan-400 block group-hover:underline">Database Caching Setup</span>
                    <span className="text-[9px] text-[#94A3B8] block mt-0.5 line-clamp-1">In my recent system design project, we selected PostgreSQL for structured profile storage...</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => loadSpokenSample("hr1")}
                  className="w-full text-left bg-[#111A2E] border-2 border-[#22314D] hover:border-[#06B6D4] hover:border-violet-500 hover:bg-violet-500/5 p-2.5 font-mono text-[10px] text-[#F8FAFC] transition group flex items-start gap-2"
                >
                  <span className="bg-violet-500/10 border border-violet-500/30 text-violet-400 font-bold px-1 py-0.5 text-[8px] uppercase shrink-0 mt-0.5">BEHAVIORAL</span>
                  <div className="flex-1">
                    <span className="font-bold text-violet-400 block group-hover:underline">Operational Bottlenecks</span>
                    <span className="text-[9px] text-[#94A3B8] block mt-0.5 line-clamp-1">I resolved an operational technical bottleneck during my internship by coordinating dynamic updates...</span>
                  </div>
                </button>
              </div>

              {/* INTERACTIVE MANUAL TYPING COMPENSATOR TOGGLE */}
              <div className="mt-4 border-t border-[#22314D] pt-3 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] text-zinc-400 uppercase font-bold">⌨️ Keyboard Keypad Fallback</span>
                  <button
                    type="button"
                    onClick={() => setShowTextFallback(!showTextFallback)}
                    className="font-mono text-[10px] text-[#06B6D4] hover:text-[#22D3EE] hover:underline"
                  >
                    {showTextFallback ? "Hide typing field" : "Show keyboard entry ⚡"}
                  </button>
                </div>

                {showTextFallback ? (
                  <div className="text-left animate-fadeIn space-y-1.5">
                    <textarea 
                      value={userReply}
                      onChange={(e) => setUserReply(e.target.value)}
                      placeholder="Or type/paste your custom simulated response directly here..."
                      className="w-full h-24 bg-[#090D16] border border-[#22314D] focus:border-[#06B6D4] p-2 text-[#F8FAFC] font-mono text-xs outline-hidden"
                    />
                    <p className="font-mono text-[9px] text-zinc-500 uppercase">You can review or edit what's written before tapping "Send Spoken Voice Answer" on the left panel.</p>
                  </div>
                ) : (
                  <p className="font-mono text-[9px] text-[#94A3B8]">
                    Tapping one of the simulated responses above will automatically pre-load it directly into the answer buffer on the left side.
                  </p>
                )}
              </div>
            </BrutalistCard>

            <BrutalistCard variant="default">
              <h4 className="font-mono text-xs font-black text-[#F8FAFC] uppercase mb-2">// Placement Grader Checklist</h4>
              <ul className="font-mono text-[11px] text-[#94A3B8] flex flex-col gap-2.5 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-[#06B6D4]">■</span>
                  <span><strong>Formulate Structured answers:</strong> Highlight complexities, algorithms, or frameworks explicit details.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#06B6D4]">■</span>
                  <span><strong>Voice Modulation:</strong> Keep speaking confidently with descriptive terminology.</span>
                </li>
              </ul>
            </BrutalistCard>
          </div>

        </div>
      ) : results ? (
        /* EVALUATION & SEPARATED ACTIVE COACH CHAT SCREEN */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: RESULTS & DETAILED FEEDBACK PANEL */}
          <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-4">
            
            <BrutalistCard variant="default" className="flex flex-col gap-4">
              <span className="font-mono text-xs text-[#06B6D4] font-black uppercase block mb-1">
                // STAGE 1: GRADING SCORECARD
              </span>
              <h2 className="font-sans text-2xl font-black text-[#F8FAFC]">INTERVIEW METRICS SUMMARY</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#090D16] p-4 border border-[#22314D]">
                <div>
                  <div className="font-mono text-[9px] text-[#94A3B8] uppercase">Final Result Score</div>
                  <div className="font-sans text-4xl font-black text-emerald-400">{results.score || 72}/100</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] text-[#94A3B8] uppercase">Communication Pacing</div>
                  <div className="font-mono text-xs font-bold text-[#06B6D4] mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-[#06B6D4]" /> SATISFACTORY
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[9px] text-[#94A3B8] uppercase">Extracted Target Key</div>
                  <div className="font-mono text-xs font-bold text-violet-400 mt-2 truncate">
                     {role}
                  </div>
                </div>
              </div>

              <div className="font-mono text-xs text-[#CBD5E1] p-4 bg-[#090D16] border border-[#22314D] leading-relaxed whitespace-pre-wrap max-h-[240px] overflow-y-auto select-text">
                {results.feedback || "Placement scores recorded successfully."}
              </div>

              {results.breakdown && results.breakdown.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] text-[#CBD5E1] uppercase font-bold tracking-wider">// DETAILED QUESTION DRILLDOWN</span>
                  <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                    {results.breakdown.map((item: any, id: number) => (
                      <div key={id} className="p-2 border border-[#22314D] bg-[#090D16]/50 text-left font-mono text-[10px]">
                        <div className="flex justify-between font-bold text-[#CBD5E1] mb-0.5">
                          <span className="truncate max-w-xs">{item.question || `Metric ${id + 1}`}</span>
                          <span className="text-[#06B6D4] shrink-0">Rating: {item.rating}/5</span>
                        </div>
                        <p className="text-zinc-400">{item.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <PrimaryButton onClick={handleStartInterview} className="w-full mt-2">
                Start A New Voice Session 🎤
              </PrimaryButton>
            </BrutalistCard>
            
          </div>

          {/* RIGHT: SEPARATED ACTIVE AI CONVERSATIONAL COACH CHATBOT */}
          <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-4">
            
            <BrutalistCard variant="accent" className="flex flex-col gap-3 min-h-[620px] max-h-[680px] border-[#06B6D4]">
              
              <div className="border-b border-[#22314D] pb-2.5 flex justify-between items-center select-none">
                <span className="font-mono text-[10px] text-yellow-400 flex items-center gap-1.5 uppercase font-black">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                  STAGE 2: ACTIVE AI PREP COACH
                </span>
                
                <span className="font-mono text-[9px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-1.5 py-0.5">
                  Tutor Mode
                </span>
              </div>

              <p className="font-mono text-[10px] text-[#CBD5E1] leading-tight">
                This coach assistant bot helps you practice subjects, correct weaknesses, or frame correct model answers based on your score metrics.
              </p>

              {/* COACH CONVERSATIONAL CONTAINER */}
              <div className="flex-grow overflow-y-auto p-2 bg-[#090D16] border border-[#22314D] flex flex-col gap-3.5 min-h-[280px] max-h-[380px]">
                {coachMessages.map((c, idx) => {
                  const isCoach = c.role === "coach";
                  return (
                    <div 
                      key={idx} 
                      className={`flex gap-2 max-w-[92%] transition-all ${isCoach ? "self-start" : "self-end flex-row-reverse"}`}
                    >
                      {/* Speaker avatar */}
                      <div className={`p-1.5 border shrink-0 text-[10px] font-mono h-7 w-7 flex items-center justify-center ${
                        isCoach ? "bg-[#1C253B] border-[#06B6D4] text-yellow-400 font-black" : "bg-emerald-950/40 border-emerald-500/50 text-[#F8FAFC]"
                      }`}>
                        {isCoach ? "🤖" : "YOU"}
                      </div>
                      
                      {/* Coach comment */}
                      <div className={`p-3 border font-mono text-[11px] leading-relaxed select-text whitespace-pre-wrap ${
                        isCoach ? "bg-[#111A2E]/70 border-[#22314D] text-[#CBD5E1]" : "bg-emerald-950/20 border-emerald-500/30 text-[#F8FAFC]"
                      }`}>
                        {c.content}
                      </div>
                    </div>
                  );
                })}

                {isCoachTyping && (
                  <div className="flex gap-2 max-w-[85%] self-start items-center">
                    <div className="p-1.5 border shrink-0 text-[10px] font-mono h-7 w-7 bg-[#1C253B] border-[#06B6D4] text-yellow-400 flex items-center justify-center font-bold">🤖</div>
                    <div className="font-mono text-[10px] text-zinc-500 italic animate-pulse">Coach is reviews score details and drafting study tips...</div>
                  </div>
                )}
                <div ref={coachBottomRef} />
              </div>

              {/* QUICK COACH PREP SUGGESTION PILLS */}
              <div className="flex flex-col gap-1.5 border-t border-[#22314D] pt-2.5">
                <span className="font-mono text-[9px] text-[#94A3B8] uppercase block font-bold">💡 Practice Strategies (Click to ask your coach):</span>
                
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => submitCoachPrompt(`How can I improve my answers for ${role} role?`)}
                    className="bg-[#1C253B] hover:bg-[#2A375A] border border-[#22314D] text-[10px] px-2 py-1 text-zinc-300 font-mono"
                  >
                    🚀 Let's analyze my report weaknesses
                  </button>
                  <button
                    type="button"
                    onClick={() => submitCoachPrompt("Can you give me a typical technical question for this role, and review my answer?")}
                    className="bg-[#1C253B] hover:bg-[#2A375A] border border-[#22314D] text-[10px] px-2 py-1 text-zinc-300 font-mono"
                  >
                    📝 Give me a mock interview math question
                  </button>
                  <button
                    type="button"
                    onClick={() => submitCoachPrompt("How should I restructure my answers to get higher ratings in the system design rubric?")}
                    className="bg-[#1C253B] hover:bg-[#2A375A] border border-[#22314D] text-[10px] px-2 py-1 text-zinc-300 font-mono"
                  >
                    💡 Help me improve system design scaling answers
                  </button>
                </div>
              </div>

              {coachError && (
                <div className="text-[10px] font-mono text-rose-400">
                  {coachError}
                </div>
              )}

              {/* COACH CHAT DIALOG INPUT FORM */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  submitCoachPrompt(coachInput);
                }}
                className="flex gap-2 pt-2 border-t border-[#22314D]"
              >
                <input 
                  type="text" 
                  value={coachInput}
                  onChange={(e) => setCoachInput(e.target.value)}
                  placeholder="Ask Coach details, tips, queries..."
                  className="flex-1 bg-[#090D16] border border-[#22314D] focus:border-yellow-400 px-3 py-2 text-[#F8FAFC] font-mono text-xs outline-hidden"
                  disabled={isCoachTyping}
                />
                
                <button
                  type="submit"
                  disabled={!coachInput.trim() || isCoachTyping}
                  className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-45 text-[#090D16] font-mono font-bold text-xs uppercase px-3.5 flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

            </BrutalistCard>
            
          </div>

        </div>
      ) : (
        /* INITIAL WELCOME OR NOT CHAT GRID */
        <div className="p-20 border-2 border-dashed border-[#22314D] bg-[#111A2E] text-center max-w-2xl mx-auto my-6">
          <Award className="w-12 h-12 text-[#22314D] mx-auto mb-4" />
          <h3 className="font-sans text-xl font-black text-[#F8FAFC] mb-2">INTERVIEW SESSION READY</h3>
          <p className="font-mono text-xs text-[#94A3B8] max-w-sm mx-auto mb-6">
            Specify your target placement role and select the round mode above, then click 'Begin Voice Interview' to start your screen practice round.
          </p>
          <PrimaryButton onClick={handleStartInterview}>Begin Voice Interview</PrimaryButton>
        </div>
      )}

    </div>
  );
};
