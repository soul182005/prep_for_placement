import React, { useState } from "react";
import { 
  Flame, 
  Terminal, 
  Compass, 
  FileText, 
  BookOpen, 
  Layers, 
  MessageSquare,
  Sparkles,
  Plus,
  Trash2,
  Sliders,
  AlertTriangle
} from "lucide-react";
import { 
  BrutalistCard, 
  StatBlock, 
  SkeletonLoader,
  PrimaryButton
} from "./BrutalistPrimitives";
import { DashboardStats, SkillScore } from "../types";
import { api } from "../lib/api-client";
import { motion } from "motion/react";

interface DashboardTabProps {
  stats: DashboardStats | null;
  loading: boolean;
  onNavigate: (tab: any) => void;
  onRefreshStats: () => Promise<void>;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ 
  stats, 
  loading, 
  onNavigate,
  onRefreshStats 
}) => {
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillScore, setNewSkillScore] = useState(70);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  const skillsList = stats?.skillScores ?? [];
  const N = skillsList.length;

  // Handler to slide exist subjects in real-time
  const handleUpdateProficiency = async (skillName: string, newScore: number) => {
    const updated = skillsList.map(s => {
      if (s.skill.toLowerCase() === skillName.toLowerCase()) {
        return { skill: s.skill, score: Math.round(newScore) };
      }
      return { skill: s.skill, score: s.score };
    });
    setSaving(true);
    try {
      await api.saveCustomSkills(updated);
      await onRefreshStats();
    } catch (e: any) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Handler to remove a custom subject
  const handleDeleteSkill = async (skillName: string) => {
    const updated = skillsList
      .filter(s => s.skill.toLowerCase() !== skillName.toLowerCase())
      .map(s => ({ skill: s.skill, score: s.score }));
    setSaving(true);
    try {
      await api.saveCustomSkills(updated);
      await onRefreshStats();
    } catch (e: any) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Handler to add a new subject with proficiency
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameCleaned = newSkillName.trim();
    if (!nameCleaned) return;

    const exists = skillsList.some(s => s.skill.toLowerCase() === nameCleaned.toLowerCase());
    if (exists) {
      setErrorMsg("Subject already exists. Customize its score below!");
      return;
    }

    const updated = [
      ...skillsList.map(s => ({ skill: s.skill, score: s.score })),
      { skill: nameCleaned, score: Math.round(newSkillScore) }
    ];

    setSaving(true);
    setErrorMsg("");
    try {
      await api.saveCustomSkills(updated);
      setNewSkillName("");
      setNewSkillScore(75);
      await onRefreshStats();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to register custom subject.");
    } finally {
      setSaving(false);
    }
  };

  // Radar Plot Coordinate calculations
  const centerX = 100;
  const centerY = 100;
  const radius = 75;

  const getCoordinates = () => {
    if (N < 3) return [];
    return skillsList.map((item, i) => {
      const angle = (i * 2 * Math.PI / N) - Math.PI / 2;
      const scoreRatio = Math.max(5, Math.min(100, item.score)) / 100;
      
      const x = centerX + scoreRatio * radius * Math.cos(angle);
      const y = centerY + scoreRatio * radius * Math.sin(angle);
      
      // Let's place label slightly further out
      const labelX = centerX + 1.22 * radius * Math.cos(angle);
      const labelY = centerY + 1.22 * radius * Math.sin(angle);

      return {
        skill: item.skill,
        score: item.score,
        x,
        y,
        labelX,
        labelY,
        angle
      };
    });
  };

  const coordinates = getCoordinates();
  const polygonPoints = coordinates.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#22314D] pb-6 text-left">
        <div>
          <h2 className="font-sans text-3xl font-black text-[#F8FAFC] tracking-tight">
            CANDIDATE DASHBOARD
          </h2>
          <p className="font-mono text-xs text-[#CBD5E1] mt-1">Review your custom subjects, calibrate starting proficiency levels, and check performance matrices.</p>
        </div>

        <div className="flex items-center gap-3 bg-[#111A2E] border border-[#22314D] p-3 shadow-[2px_2px_0px_0px_#22314D]">
          <Flame className="w-5 h-5 text-[#06B6D4]" />
          <div className="text-left">
            <span className="font-mono text-[10px] uppercase text-[#CBD5E1] block leading-none">PREP STREAK</span>
            <span className="font-mono text-sm font-bold text-[#06B6D4]">{stats?.streak ?? 0} Days consecutive</span>
          </div>
        </div>
      </div>

      {/* DYNAMIC SUBJECT STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonLoader className="h-16" />
            <SkeletonLoader className="h-16" />
            <SkeletonLoader className="h-16" />
          </>
        ) : skillsList.length > 0 ? (
          skillsList.map((s) => (
            <StatBlock 
              key={s.id}
              label={s.skill} 
              value={`${s.score}%`} 
              progress={s.score}
            />
          ))
        ) : (
          <div className="p-6 border-2 border-dashed border-[#22314D] bg-[#111A2E] text-center sm:col-span-2 lg:col-span-3 xl:col-span-4 py-8">
            <Sparkles className="w-6 h-6 text-[#94A3B8] mx-auto mb-2 animate-pulse" />
            <span className="font-mono text-xs uppercase text-[#CBD5E1] font-bold block mb-1">NO TRACKED SUBJECTS DEFINED</span>
            <p className="font-mono text-[10px] text-[#94A3B8]">Enter your focus subjects below to build your customizable radar graph and track your proficiencies!</p>
          </div>
        )}
      </div>

      {/* MID SECTION - RADAR MATRIX + MANAGE PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* DYNAMIC RADAR MATRIX DIAGRAM */}
        <BrutalistCard className="lg:col-span-6 flex flex-col justify-between text-left" variant="accent">
          <div>
            <h3 className="font-mono text-xs uppercase font-black text-[#06B6D4] tracking-wider mb-1">// COGNITIVE RADAR MATRIX</h3>
            <p className="font-mono text-[10px] text-[#94A3B8] mb-4">Visual representation of your custom subjects and registered proficiencies.</p>
          </div>

          <div className="flex justify-center items-center py-6 min-h-[240px]">
            {N === 0 ? (
              <div className="text-center p-6 text-[#94A3B8] max-w-xs">
                <Sliders className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#06B6D4]" />
                <p className="font-mono text-[11px] leading-relaxed">No subjects registered yet. Create subjects on the right to initialize your progress chart!</p>
              </div>
            ) : N < 3 ? (
              <div className="text-center p-6 text-[#94A3B8] max-w-xs">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500 opacity-80" />
                <p className="font-mono text-[11px] leading-relaxed">A radar polygon requires at least <span className="text-[#06B6D4] font-bold">3 subjects</span> to map details. Please add {3 - N} more subject(s) to activate visual charts!</p>
              </div>
            ) : (
              <svg className="w-64 h-64 overflow-visible" viewBox="0 0 200 200">
                {/* Concentric helper grids */}
                {[20, 40, 60, 80, 100].map((lvl, index) => {
                  // Draw helper levels
                  const points = Array.from({ length: N }).map((_, i) => {
                    const angle = (i * 2 * Math.PI / N) - Math.PI / 2;
                    const x = centerX + (lvl / 100) * radius * Math.cos(angle);
                    const y = centerY + (lvl / 100) * radius * Math.sin(angle);
                    return `${x},${y}`;
                  }).join(" ");

                  return (
                    <polygon 
                      key={lvl}
                      points={points} 
                      fill="none" 
                      stroke={lvl === 100 ? "#33476E" : "#22314D"} 
                      strokeWidth="1" 
                      strokeDasharray={lvl === 100 ? "none" : "2,2"}
                    />
                  );
                })}

                {/* Draw axes lines */}
                {Array.from({ length: N }).map((_, i) => {
                  const angle = (i * 2 * Math.PI / N) - Math.PI / 2;
                  const x = centerX + radius * Math.cos(angle);
                  const y = centerY + radius * Math.sin(angle);
                  return (
                    <line 
                      key={i}
                      x1={centerX} 
                      y1={centerY} 
                      x2={x} 
                      y2={y} 
                      stroke="#33476E" 
                      strokeWidth="1" 
                    />
                  );
                })}

                {/* Dynamic Polygons */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ originX: "100px", originY: "100px" }}
                  transition={{ type: "spring", stiffness: 85, damping: 14 }}
                >
                  <polygon 
                    points={polygonPoints} 
                    fill="rgba(6, 182, 212, 0.15)" 
                    stroke="#06B6D4" 
                    strokeWidth="2"
                  />
                  {coordinates.map((c, idx) => {
                    const isHovered = hoveredSkill === c.skill.toLowerCase();
                    return (
                      <g 
                        key={idx}
                        onMouseEnter={() => setHoveredSkill(c.skill.toLowerCase())}
                        onMouseLeave={() => setHoveredSkill(null)}
                      >
                        <circle 
                          cx={c.x} 
                          cy={c.y} 
                          r={isHovered ? "5" : "3.5"} 
                          fill={isHovered ? "#06B6D4" : "#F8FAFC"} 
                          stroke="#06B6D4" 
                          strokeWidth="1.5" 
                          className="transition-all cursor-pointer"
                        />
                        <text
                          x={c.labelX}
                          y={c.labelY}
                          textAnchor={
                            Math.cos(c.angle) > 0.15 
                              ? "start" 
                              : Math.cos(c.angle) < -0.15 
                                ? "end" 
                                : "middle"
                          }
                          alignmentBaseline="middle"
                          fill={isHovered ? "#06B6D4" : "#CBD5E1"}
                          className="font-mono text-[7px] font-black uppercase tracking-wider transition-colors select-none"
                        >
                          {c.skill} ({c.score}%)
                        </text>
                      </g>
                    );
                  })}
                </motion.g>
              </svg>
            )}
          </div>

          <div className="p-3 border border-[#22314D] bg-[#090D16] flex items-center gap-3 mt-4">
            <Terminal className="w-4 h-4 text-[#06B6D4] shrink-0" />
            <span className="font-mono text-[9px] text-[#CBD5E1] uppercase leading-relaxed">
              {N < 3 
                ? "Calibrate and register at least three skills in your management control deck to render an interactive diagnostic radar web instantly."
                : "Operational parameters synced. Drag the proficiency controllers in real-time or register new tags to update your candidate graph."}
            </span>
          </div>
        </BrutalistCard>

        {/* SUBJECTS MANAGEMENT INTERACTION TERMINAL */}
        <div className="lg:col-span-6 flex flex-col gap-4 text-left">
          
          {/* ADD NEW SUBJECT SUB-FORM CARD */}
          <BrutalistCard variant="default">
            <div>
              <h3 className="font-mono text-xs uppercase font-black text-[#06B6D4] tracking-wider mb-1">// REGISTER NEW SUBJECT</h3>
              <p className="font-mono text-[10px] text-[#94A3B8] mb-4">Input a custom topic and select your current initial proficiency.</p>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] text-[#CBD5E1] uppercase mb-1">Subject / Skill Name</label>
                <input 
                  type="text"
                  maxLength={24}
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. Node.js, React, Python, Accounting..."
                  className="w-full bg-[#090D16] border-2 border-[#22314D] text-[#F8FAFC] font-mono text-xs p-3 focus:outline-none focus:border-[#06B6D4]"
                  disabled={saving}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-mono text-[10px] text-[#CBD5E1] uppercase">Starting Proficiency</label>
                  <span className="font-mono text-xs font-bold text-[#06B6D4]">{newSkillScore}%</span>
                </div>
                <input 
                  type="range"
                  min="5"
                  max="100"
                  value={newSkillScore}
                  onChange={(e) => setNewSkillScore(Number(e.target.value))}
                  className="w-full accent-[#06B6D4]"
                  disabled={saving}
                />
              </div>

              {errorMsg && (
                <div className="p-2 border border-[#06B6D4] bg-[#1C253B] font-mono text-[9px] text-[#06B6D4] uppercase">
                  {errorMsg}
                </div>
              )}

              <PrimaryButton 
                type="submit"
                disabled={saving || !newSkillName.trim()}
                icon={<Plus className="w-4 h-4" />}
                className="w-full"
              >
                {saving ? "Registering..." : "Add Subject"}
              </PrimaryButton>
            </form>
          </BrutalistCard>

          {/* ACTIVE SUBJECTS SLIDER LIST */}
          <BrutalistCard variant="default">
            <div>
              <h3 className="font-mono text-xs uppercase font-black text-[#CBD5E1] tracking-wider mb-1">// ACTIVE SUBJECTS DECK</h3>
              <p className="font-mono text-[10px] text-[#94A3B8] mb-4">Tweak proficiency metrics in real-time or delete obsolete logs.</p>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {skillsList.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-[#22314D] bg-[#090D16]">
                  <Sliders className="w-6 h-6 text-[#33476E] mx-auto mb-1" />
                  <p className="font-mono text-[9px] text-[#94A3B8]">No active tracking metrics. Fill out the registration form above!</p>
                </div>
              ) : (
                skillsList.map((skillObj) => {
                  const isHovered = hoveredSkill === skillObj.skill.toLowerCase();
                  return (
                    <div 
                      key={skillObj.id}
                      className={`p-3 border-2 ${isHovered ? "border-[#06B6D4]" : "border-[#22314D]"} bg-[#090D16] flex items-center justify-between gap-4 transition-colors`}
                      onMouseEnter={() => setHoveredSkill(skillObj.skill.toLowerCase())}
                      onMouseLeave={() => setHoveredSkill(null)}
                    >
                      <div className="flex-grow space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs font-black uppercase text-[#F8FAFC]">{skillObj.skill}</span>
                          <span className="font-mono text-xs font-bold text-[#06B6D4]">{skillObj.score}%</span>
                        </div>
                        <input 
                           type="range"
                           min="5"
                           max="100"
                           value={skillObj.score}
                           onChange={(e) => handleUpdateProficiency(skillObj.skill, Number(e.target.value))}
                           className="w-full accent-[#06B6D4]"
                           disabled={saving}
                        />
                      </div>

                      <button 
                        onClick={() => handleDeleteSkill(skillObj.skill)}
                        className="p-2 border border-[#33476E] hover:border-[#06B6D4] hover:bg-[#1C253B] text-[#94A3B8] hover:text-[#06B6D4] cursor-pointer transition-all shrink-0"
                        title="Delete Subject"
                        disabled={saving}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </BrutalistCard>
        </div>

      </div>
    </div>
  );
};
