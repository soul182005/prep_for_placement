import React, { useState, useEffect } from "react";
import { FileText, RefreshCw, Star, Layers, CheckCircle2 } from "lucide-react";
import { PrimaryButton, BrutalistCard } from "./BrutalistPrimitives";
import { api } from "../lib/api-client";

interface ResumeTabProps {
  onRefreshStats: () => void;
}

export const ResumeTab: React.FC<ResumeTabProps> = ({ onRefreshStats }) => {
  const [resumeTextInput, setResumeTextInput] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [uploadedResume, setUploadedResume] = useState<any>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState("");

  // Retrieve existing resume on mount
  useEffect(() => {
    async function fetchExistingResume() {
      try {
        const resp = await api.getResume();
        if (resp.resume) {
          setUploadedResume(resp.resume);
          setResumeFileName(resp.resume.fileUrl.split("/").pop() || "parsed_resume.pdf");
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchExistingResume();
  }, []);

  const handleResumeSimulate = async () => {
    setResumeError("");
    if (!resumeTextInput.trim()) {
      setResumeError("Provide raw plain text resume content/experience lists first.");
      return;
    }
    setIsUploadingResume(true);
    try {
      const label = resumeFileName || "engineer_placement_resume.pdf";
      const resp = await api.uploadResume(resumeTextInput, label);
      setUploadedResume(resp.resume);
      onRefreshStats();
    } catch (e: any) {
      setResumeError(e.message || "Failed processing text feed through scanner.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
      {/* INPUT EDITOR PANE */}
      <div className="lg:col-span-6 flex flex-col gap-4">
        <div className="border-b-2 border-[#22314D] pb-4 mb-2">
          <h2 className="font-sans text-2xl font-black text-[#F8FAFC]">
            RESUME ANALYZER
          </h2>
          <p className="font-mono text-xs text-[#CBD5E1]">Analyze your resume structure, strengths, and ATS keywords by pasting your markdown or plain text below.</p>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block font-mono text-[10px] uppercase text-[#CBD5E1] mb-1">Resume File Name Link</label>
            <input 
              type="text" 
              value={resumeFileName}
              onChange={(e) => setResumeFileName(e.target.value)}
              placeholder="e.g. CS_Graduate_Placement.pdf"
              className="w-full bg-[#111A2E] border-2 border-[#22314D] focus:border-[#06B6D4] px-3 py-2 text-[#F8FAFC] font-mono text-xs outline-hidden rounded-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase text-[#CBD5E1] mb-1">Resume Contents (Plain Text / Markdown)</label>
          <textarea
            value={resumeTextInput}
            onChange={(e) => setResumeTextInput(e.target.value)}
            placeholder="ALAN TURING (alan@bletchley.edu)&#10;&#10;CORE SKILLS: TypeScript, Go, Python, Machine Learning Algorithms, Cryptography.&#10;&#10;PROJECT EXPERIENCE:&#10;- Lead Crypto Compiler Engine: Built distributed O(1) matching platform in Node.js lowering runtime clock ticks by 65%.&#10;- Sub-graph routing scheduler: Constructed Go scheduling cluster supporting heavy concurrent database threads."
            className="w-full h-80 bg-[#111A2E] border-2 border-[#22314D] focus:border-[#06B6D4] p-4 text-[#F8FAFC] font-mono text-xs outline-hidden resize-none rounded-none"
          />
        </div>

        {resumeError && (
          <div className="p-3 border border-[#06B6D4] bg-[#1C253B] font-mono text-[10px] text-[#06B6D4]">
            ✕ ERROR: {resumeError}
          </div>
        )}

        <PrimaryButton 
          onClick={handleResumeSimulate}
          disabled={isUploadingResume}
          icon={isUploadingResume ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers />}
        >
          {isUploadingResume ? "Analyzing resume contents..." : "Upload & Analyze Resume"}
        </PrimaryButton>
      </div>

      {/* COMPILER OUTPUT FEEDBACK */}
      <div className="lg:col-span-6">
        <BrutalistCard className="h-full flex flex-col gap-4">
          <div className="px-4 py-2 bg-[#06B6D4]/5 border-l-4 border-[#06B6D4] flex justify-between items-center">
            <span className="font-mono text-xs uppercase font-extrabold tracking-wider text-[#06B6D4]">
              // EVALUATION SUMMARY & INSIGHTS
            </span>
            {uploadedResume && (
              <span className="font-mono text-[9px] text-[#CBD5E1] flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 text-emerald-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ANALYSIS COMPLETED
              </span>
            )}
          </div>

          {uploadedResume ? (
            <div className="flex-1 flex flex-col gap-4">
              <div className="p-3 bg-[#090D16] border border-[#22314D] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#06B6D4]" />
                  <span className="font-mono text-xs font-bold text-[#F8FAFC]">
                    {resumeFileName || "analyst_report.pdf"}
                  </span>
                </div>
              </div>

              <div 
                className="font-mono text-xs text-[#CBD5E1] leading-relaxed whitespace-pre-wrap select-text h-[420px] overflow-y-auto pr-2 bg-[#090D16] p-4 border border-[#22314D]"
              >
                {uploadedResume.aiFeedback || "Processing feedback summary..."}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center py-20 text-center">
              <FileText className="w-12 h-12 text-[#22314D] mb-3" />
              <p className="font-mono text-xs text-[#94A3B8] max-w-sm">
                Enter your resume details on the left, then click 'Upload & Analyze Resume' to get professional feedback and ATS recommendations.
              </p>
            </div>
          )}
        </BrutalistCard>
      </div>
    </div>
  );
};
