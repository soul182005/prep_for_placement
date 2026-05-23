import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Terminal, 
  Layers, 
  LineChart, 
  LogOut, 
  Flame, 
  User as UserIcon, 
  BookOpen, 
  MessageSquare, 
  ArrowRight,
  Sparkles,
  Cpu
} from "lucide-react";
import { api } from "./lib/api-client";
import { 
  GridBackground, 
  NeonTubesBackground, 
  PageTransition,
  cn
} from "./components/BrutalistPrimitives";
import { User as UserType, DashboardStats } from "./types";

// Import modular pages
import { LandingTab } from "./components/LandingTab";
import { DashboardTab } from "./components/DashboardTab";
import { ResumeTab } from "./components/ResumeTab";
import { AptitudeTab } from "./components/AptitudeTab";
import { CodingTab } from "./components/CodingTab";
import { InterviewTab } from "./components/InterviewTab";
import { AnalyticsTab } from "./components/AnalyticsTab";

export default function App() {
  const [currentTab, setCurrentTab] = useState<"dashboard" | "resume" | "aptitude" | "coding" | "interview" | "analytics">("dashboard");
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Global Dashboard & Activity States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Initialize session and verify token auth
  useEffect(() => {
    async function loadMe() {
      try {
        const data = await api.getMe();
        if (data.user) {
          setUser(data.user);
        }
      } catch (e) {
        console.warn("User session is inactive. Accessing demo parameters.");
      } finally {
        setIsLoadingUser(false);
      }
    }
    loadMe();
  }, []);

  // Sync state data on dynamic progression changes
  const triggerDashboardLoad = async () => {
    if (!user) return;
    setLoadingDashboard(true);
    try {
      const resp = await api.getDashboard();
      setStats(resp);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (user) {
      triggerDashboardLoad();
    }
  }, [user, currentTab]);

  const handleAuthSuccess = (authenticatedUser: UserType) => {
    setUser(authenticatedUser);
    setCurrentTab("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("placement_token");
    setUser(null);
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] flex flex-col justify-center items-center font-mono">
        <Cpu className="w-12 h-12 text-[#06B6D4] animate-spin mb-4" />
        <p className="text-xs uppercase tracking-widest text-[#94A3B8]">Loading candidate dashboard...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#090D16] text-[#F8FAFC] flex flex-col overflow-x-hidden selection:bg-[#06B6D4] selection:text-[#F8FAFC]">
      {/* Dynamic graphic backgrounds */}
      <NeonTubesBackground />
      <GridBackground />

      {/* CORE FRAME LAYOUT AREA */}
      <div className="relative z-10 flex-grow max-w-[1400px] w-full mx-auto px-4 py-6 md:px-8 md:py-8 flex flex-col gap-6">
        
        {/* TOP STATUS UTILITY BELT */}
        <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-2 border-[#22314D] bg-[#111A2E] p-4 shadow-[4px_4px_0px_0px_#22314D]">
          <div className="flex items-center gap-3">
            <div className="bg-[#06B6D4] p-2 text-[#F8FAFC] border-2 border-[#F8FAFC] shadow-[2px_2px_0px_0px_#22314D]">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="text-left font-sans font-black tracking-tight uppercase leading-none">
              <span className="text-lg md:text-xl block">Smart Prep</span>
              <span className="font-mono text-[9px] text-[#94A3B8] tracking-wider font-extrabold">// PLACEMENT PREPARATION PLATFORM</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-end">
            {user ? (
              <>
                <div className="flex items-center gap-2 border border-[#22314D] bg-[#090D16] px-3 py-1.5 font-mono text-[10px] text-[#CBD5E1]">
                  <UserIcon className="w-3.5 h-3.5 text-[#06B6D4]" />
                  <span>{user.name.toUpperCase()}</span>
                </div>

                <button 
                  onClick={handleLogout}
                  className="px-3 py-1.5 border border-[#06B6D4]/30 bg-[#1C253B] text-[#06B6D4] font-mono text-[10px] uppercase font-bold hover:bg-[#06B6D4] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  <LogOut className="w-3 h-3 inline mr-1" /> Logout
                </button>
              </>
            ) : (
              <span className="font-mono text-[10px] text-[#06B6D4] blink uppercase font-black">// SESSION DISCONNECTED</span>
            )}
          </div>
        </header>

        {/* WORKSTATION CONTENT PANES */}
        {!user ? (
          <LandingTab 
            onAuthSuccess={handleAuthSuccess} 
            setUser={setUser}
            setCurrentTab={setCurrentTab}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
            
            {/* LEFT BAR PANEL INDEX */}
            <aside className="lg:col-span-3 flex flex-col gap-3">
              <span className="font-mono text-[9px] uppercase font-black text-[#CBD5E1] text-left block px-1">// PREPARATION MODULES</span>
              
              <div className="flex flex-col gap-2">
                {[
                  { id: "dashboard", label: "Dashboard", icon: <Layers className="w-4 h-4" /> },
                  { id: "resume", label: "Resume Analyzer", icon: <FileText className="w-4 h-4" /> },
                  { id: "aptitude", label: "Aptitude Practice", icon: <BookOpen className="w-4 h-4" /> },
                  { id: "coding", label: "Coding Sandbox", icon: <Terminal className="w-4 h-4" /> },
                  { id: "interview", label: "Mock Interview", icon: <MessageSquare className="w-4 h-4" /> },
                  { id: "analytics", label: "Analytics Trends", icon: <LineChart className="w-4 h-4" /> }
                ].map((item) => {
                  const isActive = currentTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentTab(item.id as any)}
                      className={cn(
                        "w-full p-4 font-mono text-xs uppercase tracking-wider font-bold text-left border-2 cursor-pointer transition-all flex items-center justify-between rounded-none",
                        isActive 
                          ? "bg-[#06B6D4] border-[#F8FAFC] text-[#F8FAFC] font-black shadow-[3px_3px_0px_0px_#22314D]" 
                          : "bg-[#111A2E] border-[#22314D] text-[#CBD5E1] hover:border-[#33476E] hover:text-[#F8FAFC]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ArrowRight className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>

              {/* PERSISTENT STATUS ACCENT GRID */}
              <div className="border border-[#22314D] bg-[#111A2E] p-4 mt-2 text-left">
                <span className="font-mono text-[8px] text-[#06B6D4] font-bold block mb-1">■ SYSTEM STATUS</span>
                <p className="font-mono text-[9px] text-[#94A3B8] leading-relaxed uppercase">
                  Progress metrics are synchronized automatically. Real-time career feedback active.
                </p>
              </div>
            </aside>

            {/* MAIN INTERACTIVE WORKSPACE */}
            <main className="lg:col-span-9 border-2 border-[#22314D] bg-[#090D16] p-6 shadow-[5px_5px_0px_0px_#22314D] flex flex-col justify-start min-h-[500px]">
              <PageTransition key={currentTab}>
                {currentTab === "dashboard" && (
                  <DashboardTab 
                    stats={stats} 
                    loading={loadingDashboard} 
                    onNavigate={(tab: any) => setCurrentTab(tab)} 
                    onRefreshStats={triggerDashboardLoad}
                  />
                )}
                {currentTab === "resume" && (
                  <ResumeTab onRefreshStats={triggerDashboardLoad} />
                )}
                {currentTab === "aptitude" && (
                  <AptitudeTab onRefreshStats={triggerDashboardLoad} />
                )}
                {currentTab === "coding" && (
                  <CodingTab onRefreshStats={triggerDashboardLoad} />
                )}
                {currentTab === "interview" && (
                  <InterviewTab onRefreshStats={triggerDashboardLoad} />
                )}
                {currentTab === "analytics" && (
                  <AnalyticsTab stats={stats} />
                )}
              </PageTransition>
            </main>

          </div>
        )}

      </div>
    </div>
  );
}
