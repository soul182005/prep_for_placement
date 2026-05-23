import React, { useState } from "react";
import { Sparkles, ArrowRight, Terminal, ChevronRight, Check } from "lucide-react";
import { GradientBlinds } from "./GradientBlinds";
import { User } from "../types";
import { api } from "../lib/api-client";
import { cn } from "./BrutalistPrimitives";

interface LandingTabProps {
  onAuthSuccess: (user: User) => void;
  setUser: (user: User) => void;
  setCurrentTab: (tab: any) => void;
}

export const LandingTab: React.FC<LandingTabProps> = ({ onAuthSuccess, setUser, setCurrentTab }) => {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsSubmitting(true);
    try {
      if (authMode === "register") {
        const resp = await api.register(authName, authEmail, authPassword);
        onAuthSuccess(resp.user);
      } else {
        const resp = await api.login(authEmail, authPassword);
        onAuthSuccess(resp.user);
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestBypass = () => {
    localStorage.setItem("placement_token", "mock-token-demo");
    const guestUser: User = {
      id: "usr_demo",
      name: "Guest Candidate",
      email: "demo@placement.com",
      createdAt: new Date().toISOString()
    };
    setUser(guestUser);
    onAuthSuccess(guestUser);
  };

  const scrollToAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthError("");
    const element = document.getElementById("auth-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#090D16] text-[#FFFFFF] font-sans antialiased selection:bg-[#06B6D4]/30 selection:text-[#FFFFFF] -mx-4 -my-6 md:-mx-8 md:-my-8">
      {/* 
        WebGL Multi-Stripe Interactive Background
        Parameters follow exact specifications:
        gradientColors background: [#090D16, #111A2E]
        noise: 0.15 for cinematic film grain
        spotlight parameters tuned for vibrant reaction 
      */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <GradientBlinds 
          gradientColors={["#090D16", "#111A2E"]}
          accentColor="#06B6D4"
          blindCount={22}
          noise={0.15}
          spotlightRadius={0.7}
          spotlightSoftness={0.9}
          spotlightOpacity={0.95}
          distortAmount={1.5}
          mouseDampening={0.1}
        />
        {/* Subtle decorative grid layer to enhance tech feel */}
        <div className="absolute inset-x-0 bottom-0 top-0 h-full w-full bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      </div>

      {/* FIXED NAVIGATION BAR */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#090D16]/75 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#06B6D4] to-[#1E3A8A] rounded-lg rotate-12 group-hover:rotate-45 transition-transform duration-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]"></div>
            <span className="font-display text-xl font-bold tracking-tight text-white">SmartPrep.</span>
          </a>
          


          <div className="flex items-center gap-2">
            <button 
              onClick={() => scrollToAuth("login")}
              id="nav-login-btn" 
              className="text-xs uppercase tracking-widest font-bold text-white/75 hover:text-white transition-colors px-4 py-2 cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => scrollToAuth("register")}
              id="nav-signup-btn" 
              className="bg-white text-black px-5 py-2 rounded-full text-xs uppercase tracking-wider font-bold hover:bg-white/90 transition-all cursor-pointer shadow-[0_4px_24px_rgba(255,255,255,0.15)]"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO & AUTH SECTION */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-36 md:pt-44 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* LEFT HERO CAPABILITIES */}
          <div className="lg:col-span-7 flex flex-col gap-6 text-left">


            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] text-white">
              SMART <br />
              PLACEMENT <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06B6D4] to-[#1E3A8A]">COACH.</span>
            </h1>

            <p className="font-sans text-base leading-relaxed text-white/60 max-w-xl">
              Accelerate your engineering recruitment cycles with an elegant preparation workspace. Craft high-performance resumes, benchmark technical aptitude, compilation testbeds, and mock interview engines in one unified view.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-4">
              {/* Premium Card Link */}
              <button 
                onClick={handleGuestBypass}
                className="group relative flex items-center justify-between gap-6 bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] cursor-pointer text-left w-full sm:max-w-md"
              >
                <div className="flex flex-col">
                  <span className="text-white/40 text-[9px] uppercase tracking-widest font-bold mb-1">Interactive Sandbox</span>
                  <span className="text-white text-md font-display font-bold">Launch Free Evaluation</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center group-hover:translate-x-1.5 transition-transform duration-300 shadow-md">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </button>
            </div>

            {/* Structured Stats */}
            <div id="stats-overview" className="grid grid-cols-3 gap-6 border-t border-white/10 pt-10 mt-6 max-w-lg">
              <div>
                <div className="font-display text-3xl font-bold text-white">100%</div>
                <span className="block font-sans text-[10px] uppercase tracking-wider text-white/40 mt-1">Real Engines</span>
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-white">2.0</div>
                <span className="block font-sans text-[10px] uppercase tracking-wider text-white/40 mt-1">API Sandbox</span>
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-[#06B6D4]">Instant</div>
                <span className="block font-sans text-[10px] uppercase tracking-wider text-white/40 mt-1">Assessment</span>
              </div>
            </div>
          </div>

          {/* RIGHT AUTH CARD */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end" id="auth-section">
            <div className="glass-panel w-full max-w-md p-8 md:p-10 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
              {/* Mode Selectors */}
              <div className="flex border-b border-white/10 mb-8">
                <button
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  className={cn(
                    "flex-1 pb-4 font-display text-xs uppercase tracking-widest font-bold text-center cursor-pointer transition-colors",
                    authMode === "login" ? "text-white border-b border-white" : "text-white/40 hover:text-white/60"
                  )}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}
                  className={cn(
                    "flex-1 pb-4 font-display text-xs uppercase tracking-widest font-bold text-center cursor-pointer transition-colors",
                    authMode === "register" ? "text-white border-b border-white" : "text-white/40 hover:text-white/60"
                  )}
                >
                  Create Account
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-5 text-left">
                {authMode === "register" && (
                  <div>
                    <label className="block font-sans text-[10px] uppercase tracking-widest text-white/50 mb-2 font-bold font-semibold">Your Full Name</label>
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      required
                      placeholder="e.g. Alan Turing"
                      className="w-full input-dark rounded-2xl p-4 text-white text-sm placeholder:text-white/20"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-white/50 mb-2 font-bold font-semibold">Email Address</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    placeholder="name@company.com"
                    className="w-full input-dark rounded-2xl p-4 text-white text-sm placeholder:text-white/20"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-white/50 mb-2 font-bold font-semibold">Password</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full input-dark rounded-2xl p-4 text-white text-sm placeholder:text-white/20"
                  />
                </div>

                {authError && (
                  <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 font-sans text-xs flex items-center gap-2">
                    <span className="font-bold">Error:</span> {authError}
                  </div>
                )}

                {/* Submit Gradient Button */}
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-4 mt-2 rounded-2xl bg-gradient-to-r from-[#06B6D4] to-[#1E3A8A] text-white font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_40px_-5px_rgba(6,182,212,0.4)] transition-all duration-300 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Syncing Credentials..." : authMode === "login" ? "Enter Dashboard" : "Create Account & Start"}
                </button>

                <div className="flex items-center my-2">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="mx-3 text-[9px] uppercase tracking-widest text-white/30 font-bold">Or Explore Instantly</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                {/* Instant Bypass direct link to try demo */}
                <button
                  type="button"
                  onClick={handleGuestBypass}
                  className="w-full py-3.5 rounded-2xl border border-white/10 hover:border-white/25 hover:bg-white/5 text-white/85 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                >
                  Bypass with Guest Account
                </button>

                <p className="font-sans text-[9px] text-white/30 text-center uppercase tracking-wider">
                  Secure local browser authentication
                </p>
              </form>
            </div>
          </div>

        </div>
      </div>

      {/* FEATURE CARD GRID DETAILED OVERVIEW section */}
      <section id="features-overview" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center max-w-xl mx-auto mb-16">
          <span className="font-display text-[10px] uppercase tracking-[0.3em] font-bold text-[#06B6D4] block mb-2">// INTUITIVE FEATURES</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">Unified Workstation</h2>
          <p className="font-sans text-sm text-white/60">Practice engineering challenges without congested visual patterns or distractions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-8 rounded-3xl text-left hover:border-white/15 transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#06B6D4] mb-6">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-white mb-2">Sandbox Compiler</h3>
            <p className="font-sans text-xs text-white/60 leading-relaxed">
              Compile TypeScript, Python, C++, Go, and Rust with simulated secure executions against automated check suites.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl text-left hover:border-white/15 transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 mb-6">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-white mb-2">AI Assisted Analytics</h3>
            <p className="font-sans text-xs text-white/60 leading-relaxed">
              Analyze historic performance, identify metrics, track daily streaks, and outline critical concepts to study.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl text-left hover:border-white/15 transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-teal-400 mb-6">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-white mb-2">Aptitude Assess</h3>
            <p className="font-sans text-xs text-white/60 leading-relaxed">
              Solve quantitative and logical reasoning worksheets covering probabilities, combinations, and core structures.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 py-16 px-6 bg-[#090D16]/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-tr from-[#06B6D4] to-[#1E3A8A] rounded-md rotate-12"></div>
              <span className="font-display text-lg font-bold tracking-tight text-white">SmartPrep.</span>
            </div>
            <p className="text-white/40 text-xs max-w-xs leading-relaxed font-sans">
              High-performance preparation workspace for the modern engineering candidate. Engineered for pristine aesthetics.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-12 md:gap-20 text-left">
            <div className="space-y-4">
              <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40">Product</h4>
              <ul className="space-y-2 text-xs text-white/60 font-sans">
                <li><a href="#features-overview" className="hover:text-white transition-colors">Engine Workspace</a></li>
                <li><a href="#stats-overview" className="hover:text-white transition-colors">Assessment Pipelines</a></li>
                <li><a href="#auth-section" className="hover:text-white transition-colors">Candidate Portals</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40">Connect</h4>
              <ul className="space-y-2 text-xs text-white/60 font-sans">
                <li><a href="#" className="hover:text-white transition-colors">Developer Logs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community Forum</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub Repository</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between text-[10px] text-white/30 uppercase font-bold tracking-widest font-sans">
          <span>&copy; 2026 SmartPrep Studio Inc. All rights reserved.</span>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
