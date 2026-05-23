import React from "react";
import { Award, TrendingUp, BarChart2, Star, Calendar, PieChart, Activity } from "lucide-react";
import { BrutalistCard, StatBlock } from "./BrutalistPrimitives";
import { DashboardStats } from "../types";
import { motion } from "motion/react";

interface AnalyticsTabProps {
  stats: DashboardStats | null;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ stats }) => {
  const skillsList = stats?.skillScores ?? [];
  
  // Calculate average dynamically across all user custom subjects
  const average = skillsList.length > 0
    ? (skillsList.reduce((sum, s) => sum + s.score, 0) / skillsList.length).toFixed(1)
    : "0.0";

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* HEADER SECTION */}
      <div className="border-b-2 border-[#22314D] pb-4 flex justify-between items-center">
        <div>
          <h2 className="font-sans text-2xl font-black text-[#F8FAFC]">
            ANALYTICS & TRENDS
          </h2>
          <p className="font-mono text-xs text-[#CBD5E1]">Review aggregate performance indices, historical score progression, and focus areas.</p>
        </div>
        
        <div className="px-3 py-1 bg-emerald-950/40 border border-emerald-950 text-emerald-400 font-mono text-xs flex items-center gap-1.5 font-bold">
          <Activity className="w-4 h-4 text-emerald-400" /> ANALYTICS ACTIVE
        </div>
      </div>

      {/* CORE STAT BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* PROGRESS METRICS BENTO LEFT */}
        <div className="md:col-span-8 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border-2 border-[#06B6D4] bg-[#0B1528]">
              <div className="font-mono text-[9px] text-[#06B6D4] uppercase tracking-wider mb-1">RECRUITMENT READINESS SCORE</div>
              <div className="font-sans text-4xl font-black text-[#F8FAFC]">{average}%</div>
              <span className="font-mono text-[9px] text-[#94A3B8]">Average across custom subjects</span>
            </div>

            <div className="p-4 border-2 border-[#22314D] bg-[#111A2E]">
              <div className="font-mono text-[9px] text-[#CBD5E1] uppercase tracking-wider mb-1">PREP CONSISTENCY FACTOR</div>
              <div className="font-sans text-4xl font-black text-[#F8FAFC]">x{(1 + (stats?.streak ?? 0) * 0.15).toFixed(2)}</div>
              <span className="font-mono text-[9px] text-[#94A3B8]">Based on your active streaks</span>
            </div>

            <div className="p-4 border-2 border-[#22314D] bg-[#111A2E]">
              <div className="font-mono text-[9px] text-[#CBD5E1] uppercase tracking-wider mb-1">PRACTICE ATTEMPTS COMPLETED</div>
              <div className="font-sans text-4xl font-black text-[#F8FAFC]">{stats?.totalEvaluations ?? 0}</div>
              <span className="font-mono text-[9px] text-[#94A3B8]">Total exercise evaluations</span>
            </div>
          </div>

          {/* DYNAMIC SVG TREND LINE CHART */}
          <BrutalistCard variant="default">
            <span className="font-mono text-xs text-[#06B6D4] font-black uppercase tracking-wider block mb-1">
              // PREPARATION AND SCORE TIMELINE
            </span>
            <p className="font-mono text-[10px] text-[#94A3B8] mb-6">Historical trend of practice performance.</p>

            <div className="w-full h-44 mt-4">
              <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                {/* Y-axis Reference Labels & Guidelines */}
                {/* 100% Marker */}
                <text x="5" y="18" fill="#64748B" className="font-mono text-[7px] font-bold">100%</text>
                <line x1="32" y1="15" x2="500" y2="15" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,3" />

                {/* 50% Marker */}
                <text x="5" y="58" fill="#64748B" className="font-mono text-[7px] font-bold">50%</text>
                <line x1="32" y1="55" x2="500" y2="55" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,3" />

                {/* 0% Marker / Baseline */}
                <text x="5" y="98" fill="#475569" className="font-mono text-[7px] font-bold">0%</text>
                <line x1="32" y1="95" x2="500" y2="95" stroke="#334155" strokeWidth="1" />

                {/* Score mapping trend vector line - dynamic coordinates linked to supervised performance */}
                {(() => {
                  const rawTimeline = stats?.performanceTimeline || [
                    { label: "Day 1", score: 30 },
                    { label: "Day 3", score: 40 },
                    { label: "Day 5", score: 65 },
                    { label: "Day 7", score: 50 },
                    { label: "Day 9", score: 80 },
                    { label: "Day 11", score: 75 },
                    { label: "Today", score: 95 }
                  ];

                  const xMin = 38;
                  const xMax = 482;
                  const widthAvailable = xMax - xMin;
                  const numPoints = rawTimeline.length;

                  const points = rawTimeline.map((item, idx) => {
                    const x = numPoints > 1 
                      ? xMin + idx * (widthAvailable / (numPoints - 1))
                      : xMin + widthAvailable / 2;
                    const scoreBounded = Math.max(0, Math.min(100, item.score));
                    // Map score 100% to y=15, and 0% to y=95 to prevent label clashing
                    const y = 95 - (scoreBounded / 100) * 80;
                    return {
                      x,
                      y,
                      label: item.label,
                      score: scoreBounded
                    };
                  });

                  const pathStr = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
                  const dPath = "M " + points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");

                  return (
                    <>
                      {/* Gradient Fill under trend */}
                      {points.length > 0 && (
                        <motion.polygon 
                          points={`${points[0].x.toFixed(1)},95 ${pathStr} ${points[points.length - 1].x.toFixed(1)},95`} 
                          fill="rgba(6, 182, 212, 0.05)" 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 1, delay: 0.8 }}
                        />
                      )}

                      {/* Main vector path */}
                      <motion.path 
                        d={dPath}
                        fill="none" 
                        stroke="#06B6D4" 
                        strokeWidth="2.5" 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                      />

                      {/* Interactive dot handles */}
                      {points.map((p, idx) => (
                        <motion.g 
                          key={idx}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 * idx + 0.3, type: "spring", stiffness: 100, damping: 10 }}
                          style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                        >
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="4" 
                            fill="#F8FAFC" 
                            stroke="#06B6D4" 
                            strokeWidth="2" 
                          />
                          <text 
                            x={p.x} 
                            y={p.y - 8} 
                            textAnchor="middle" 
                            fill="#06B6D4" 
                            className="font-mono text-[7px] font-bold"
                          >
                            {p.score}%
                          </text>
                          <text 
                            x={p.x} 
                            y="114" 
                            textAnchor="middle" 
                            fill="#CBD5E1" 
                            className="font-mono text-[7px]"
                          >
                            {p.label}
                          </text>
                        </motion.g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </BrutalistCard>
        </div>

        {/* TOPIC BREAKDOWNS BENTO RIGHT */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <BrutalistCard variant="accent">
            <h3 className="font-mono text-xs text-[#06B6D4] font-black uppercase tracking-wider mb-2">// CORE CAPABILITY MATRIX</h3>
            <p className="font-mono text-[10px] text-[#94A3B8] mb-6">Aggregate skill metrics tracked with custom parameters.</p>

            <div className="flex flex-col gap-5 text-left">
              {skillsList.map((skillItem) => (
                <div key={skillItem.id}>
                  <div className="flex justify-between font-mono text-[10px] uppercase text-[#CBD5E1] mb-1.5 font-bold">
                    <span className="truncate pr-2">{skillItem.skill}</span>
                    <span>{skillItem.score}%</span>
                  </div>
                  <div className="relative w-full h-2.5 bg-[#1C253B] border border-[#33476E] overflow-hidden">
                    <motion.div 
                      className="h-full bg-[#06B6D4]" 
                      initial={{ width: "0%" }}
                      animate={{ width: `${skillItem.score}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
              {skillsList.length === 0 && (
                <div className="text-center font-mono text-[10px] text-[#94A3B8] py-8 border-2 border-dashed border-[#22314D]/60">
                  No subjects registered yet. Create subjects on the dashboard interface.
                </div>
              )}
            </div>

            <div className="mt-6 p-3 bg-[#090D16] border border-[#22314D] text-[9.5px] font-mono leading-relaxed text-[#94A3B8]">
              A score of at least 75% is recommended for recruitment preparation. Calibration parameters can be tweaked instantly from your candidate dashboard deck.
            </div>
          </BrutalistCard>
        </div>

      </div>
    </div>
  );
};
