import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Activity, Terminal } from "lucide-react";

/**
 * UTILS
 */
export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * PRIMARY BUTTON
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const PrimaryButton: React.FC<ButtonProps> = ({ children, icon, className, ...props }) => {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 px-6 py-3 font-mono text-sm uppercase tracking-wider font-bold text-[#F8FAFC] bg-[#06B6D4] border-2 border-[#F8FAFC] cursor-pointer shadow-[3px_3px_0px_0px_#22314D] transition-all hover:bg-[#0891B2] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
};

/**
 * SECONDARY BUTTON
 */
export const SecondaryButton: React.FC<ButtonProps> = ({ children, icon, className, ...props }) => {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 px-6 py-3 font-mono text-sm uppercase tracking-wider font-bold text-[#F8FAFC] bg-[#1C253B] border-2 border-[#CBD5E1] cursor-pointer shadow-[3px_3px_0px_0px_#6366F1] transition-all hover:bg-[#2A375A] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
};

/**
 * BRUTALIST CARD SYSTEM
 */
export const BrutalistCard: React.FC<React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "accent" | "alert" }> = ({
  children,
  className,
  variant = "default",
  ...props
}) => {
  const borderColors = {
    default: "border-[#33476E] hover:border-[#F8FAFC]",
    accent: "border-[#06B6D4]",
    alert: "border-[#EF4444]"
  };

  const bgColors = {
    default: "bg-[#111A2E]",
    accent: "bg-[#1C253B]",
    alert: "bg-[#2A1215]"
  };

  return (
    <div
      className={cn(
        "relative p-6 border-2 transition-all duration-200",
        borderColors[variant],
        bgColors[variant],
        "shadow-[4px_4px_0px_0px_#22314D] hover:shadow-[5px_5px_0px_0px_#06B6D4]",
        className
      )}
      {...props}
    >
      {/* Brutalist visual corner tabs */}
      <div className="absolute top-0 right-0 w-2 h-2 bg-[#06B6D4] border-b border-l border-[#F8FAFC]"></div>
      {children}
    </div>
  );
};

/**
 * STAT BLOCK / METRIC DISPLAY
 */
export const StatBlock: React.FC<{
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  progress?: number; // 0 to 100
}> = ({ label, value, subtext, trend, progress }) => {
  // Determine trend status and colors dynamically based on the score (progress) if available
  let badgeText = "▼ LOW";
  let badgeStyle = "text-[#EF4444] border-red-950 bg-red-950/20";

  if (progress !== undefined) {
    if (progress >= 75) {
      badgeText = "▲ HIGH";
      badgeStyle = "text-emerald-400 border-emerald-900 bg-emerald-950/40";
    } else if (progress >= 50) {
      badgeText = "◼ MID";
      badgeStyle = "text-amber-400 border-amber-900 bg-amber-950/40";
    } else {
      badgeText = "▼ LOW";
      badgeStyle = "text-[#EF4444] border-red-950 bg-red-950/20";
    }
  } else if (trend) {
    if (trend === "up") {
      badgeText = "▲ HIGH";
      badgeStyle = "text-emerald-400 border-emerald-900 bg-emerald-950/40";
    } else if (trend === "neutral") {
      badgeText = "◼ MID";
      badgeStyle = "text-amber-400 border-amber-900 bg-amber-950/40";
    } else {
      badgeText = "▼ LOW";
      badgeStyle = "text-[#EF4444] border-red-950 bg-red-950/20";
    }
  }

  return (
    <div className="p-4 border-2 border-[#33476E] bg-[#111A2E] shadow-[3px_3px_0px_0px_#22314D]">
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-xs uppercase tracking-wider text-[#CBD5E1]">{label}</span>
        {(trend || progress !== undefined) && (
          <span className={cn("font-mono text-xs px-1 border", badgeStyle)}>
            {badgeText}
          </span>
        )}
      </div>
      <div className="font-sans text-3xl font-black tracking-tight text-[#F8FAFC]">{value}</div>
      {subtext && <div className="font-mono text-xs text-[#94A3B8] mt-1">{subtext}</div>}

      {progress !== undefined && (
        <div className="relative w-full h-2 mt-3 bg-[#33476E] border border-[#1C253B] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] border-r border-[#F8FAFC]"
          />
        </div>
      )}
    </div>
  );
};

/**
 * WAVEFORM VISUALIZER
 * Animated audio grid simulating a microphone interface feedback
 */
export const WaveformVisualizer: React.FC<{ isAnimating: boolean }> = ({ isAnimating }) => {
  const [bars, setBars] = useState<number[]>(new Array(16).fill(15));
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAnimating) {
      setBars(new Array(16).fill(15));
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const animate = () => {
      setBars(prev =>
        prev.map(() => Math.floor(Math.random() * 55) + 10)
      );
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAnimating]);

  return (
    <div className="flex items-center gap-[3px] h-16 px-4 py-2 border-2 border-[#06B6D4] bg-[#090D16] w-full max-w-sm overflow-hidden shadow-[inset_0px_0px_8px_0px_#06B6D4]">
      <div className="flex items-center gap-2 mr-3 font-mono text-[10px] uppercase tracking-widest text-[#06B6D4] rotate-90 scale-90">
        <Activity className="w-3 h-3 animate-pulse text-[#06B6D4]" />
        <span>sig</span>
      </div>
      <div className="flex items-end justify-center gap-[4px] flex-1 h-full">
        {bars.map((height, idx) => (
          <motion.div
            key={idx}
            animate={{ height: `${height}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className={cn(
              "w-[6px] rounded-t-[1px]",
              idx % 3 === 0 ? "bg-[#06B6D4]" : idx % 2 === 0 ? "bg-[#8B5CF6]" : "bg-[#F8FAFC]"
            )}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * SKELETON LOADER CONVENTIONS
 */
export const SkeletonLoader: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        "relative rounded-none border border-[#33476E] bg-[#1C253B] overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-[#06B6D4]/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      <div className="absolute top-2 left-2 w-2 h-2 bg-[#06B6D4] animate-ping" />
      {/* Brutalist stripe accents inside */}
      <div className="w-full h-full opacity-10 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#06B6D4_10px,#06B6D4_20px)]" />
    </div>
  );
};

/**
 * BRUTALIST SHARP PIXEL-GRID BACKGROUND
 */
export const GridBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
      <div
        className="w-full h-full bg-[size:16px_16px]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #22314D 1px, transparent 1px),
            linear-gradient(to bottom, #22314D 1px, transparent 1px)
          `
        }}
      />
    </div>
  );
};

/**
 * NEON TUBES INTERACTIVE CURSOR BACKGROUND
 */
export const NeonTubesBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Set up tube entities
    const tubeCount = 12;
    const tubes: Array<{
      x: number;
      y: number;
      length: number;
      speed: number;
      thickness: number;
      opacity: number;
      angle: number;
      rotationSpeed: number;
    }> = [];

    for (let i = 0; i < tubeCount; i++) {
      tubes.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        length: Math.random() * 180 + 80,
        speed: Math.random() * 0.5 + 0.1,
        thickness: Math.random() * 3 + 1.5,
        opacity: Math.random() * 0.35 + 0.15,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.004
      });
    }

    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      tubes.forEach((tube, index) => {
        // Move tube slowly
        tube.angle += tube.rotationSpeed;
        tube.x += Math.cos(tube.angle) * tube.speed;
        tube.y += Math.sin(tube.angle) * tube.speed;

        // Interactive gravity toward mouse
        const dx = mouseRef.current.x - tube.x;
        const dy = mouseRef.current.y - tube.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 280) {
          // Push away slightly
          tube.x -= (dx / distance) * 0.6;
          tube.y -= (dy / distance) * 0.6;
        }

        // Boundary wrapping
        if (tube.x < -100) tube.x = canvas.width + 100;
        if (tube.x > canvas.width + 100) tube.x = -100;
        if (tube.y < -100) tube.y = canvas.height + 100;
        if (tube.y > canvas.height + 100) tube.y = -100;

        ctx.save();
        ctx.translate(tube.x, tube.y);
        ctx.rotate(tube.angle);

        // Neon Glow effect
        ctx.shadowBlur = 12;
        ctx.shadowColor = index % 3 === 0 ? "#06B6D4" : index % 2 === 0 ? "#8B5CF6" : "#A1A1AA";

        // Tube base line
        ctx.strokeStyle = index % 3 === 0 
          ? `rgba(6, 182, 212, ${tube.opacity})` 
          : index % 2 === 0 
          ? `rgba(139, 92, 246, ${tube.opacity})` 
          : `rgba(241, 245, 249, ${tube.opacity * 0.6})`;

        ctx.lineWidth = tube.thickness;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(-tube.length / 2, 0);
        ctx.lineTo(tube.length / 2, 0);
        ctx.stroke();

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-50 bg-[#090D16]" />;
};

/**
 * PAGE TRANSITION WRAPPER
 */
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
};
