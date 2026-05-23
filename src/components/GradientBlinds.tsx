import React, { useEffect, useRef } from "react";
import { Renderer, Geometry, Program, Mesh } from "ogl";

export interface GradientBlindsProps {
  gradientColors?: string[];
  accentColor?: string;
  angle?: number;
  noise?: number;
  blindCount?: number;
  blindMinWidth?: number;
  mouseDampening?: number;
  spotlightRadius?: number;
  spotlightSoftness?: number;
  spotlightOpacity?: number;
  distortAmount?: number;
  shineDirection?: "left" | "right";
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255
  ];
}

export const GradientBlinds: React.FC<GradientBlindsProps> = ({
  gradientColors = ["#090D16", "#111A2E"], // Matches body background of inside pages
  accentColor = "#06B6D4",                  // Matches high-end cyan accent of inside pages
  noise = 0.15,
  blindCount = 22,
  mouseDampening = 0.1,
  spotlightRadius = 0.7,
  spotlightSoftness = 0.9,
  spotlightOpacity = 0.95,
  distortAmount = 1.5,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mouse uniform states
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // 1. Initialise OGL Renderer
    const renderer = new Renderer({
      canvas,
      antialias: true,
      alpha: false,
      dpr: Math.min(window.devicePixelRatio, 2),
    });
    const gl = renderer.gl;

    // 2. Geometry (Full screen quad)
    const geometry = new Geometry(gl, {
      position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
      uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
    });

    // 3. Shaders
    const vertexShader = `
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColorAccent;
      uniform float uBlindCount;
      uniform float uNoise;
      uniform float uSpotlightRadius;
      uniform float uSpotlightSoftness;
      uniform float uSpotlightOpacity;
      uniform float uDistortAmount;

      varying vec2 vUv;

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      void main() {
        vec2 uv = vUv;
        
        // Add subtle procedural distortion waves
        float wave = sin(uv.y * 12.0 + uTime * 1.8) * (uDistortAmount * 0.0035);
        
        // Spotlight interaction and distance
        float dToMouse = distance(uv, uMouse);
        
        // Apply interactive blind distortion
        uv.x += wave * (1.0 - smoothstep(0.0, 0.7, dToMouse));

        // Blinds layout mapping
        float localX = fract(uv.x * uBlindCount);
        float blindId = floor(uv.x * uBlindCount);

        // Blinds edge lighting & shadow effects
        float edge = smoothstep(0.0, 0.08, localX) * smoothstep(1.0, 0.92, localX);

        float centerOfBlind = (blindId + 0.5) / uBlindCount;
        float dBlindToMouse = abs(centerOfBlind - uMouse.x);

        // Dynamic 3D tilt offset when mouse hovers over blind
        float tilt = sin(localX * 3.1415) * (1.0 - smoothstep(0.0, 0.35, dBlindToMouse)) * 0.22;

        // Gradient interpolation
        vec3 baseGradient = mix(uColor1, uColor2, uv.y + tilt);

        // Calculate Spotlight soft mask
        float spotlight = 1.0 - smoothstep(uSpotlightRadius - uSpotlightSoftness * 0.5, uSpotlightRadius + uSpotlightSoftness * 0.5, dToMouse);
        spotlight = clamp(spotlight, 0.0, 1.0) * uSpotlightOpacity;

        // Mix highlight magenta pink with purple-indigo gradient based on spotlight density
        vec3 finalColor = mix(baseGradient, uColorAccent, spotlight * 0.68);

        // High intensity glowing core
        float coreSpot = 1.0 - smoothstep(0.0, uSpotlightRadius * 0.22, dToMouse);
        finalColor += uColorAccent * coreSpot * 0.28;

        // Apply dark grooves between blinds/stripes
        finalColor *= mix(0.72, 1.0, edge);

        // Film grain noise
        float grain = (random(uv + vec2(uTime * 0.015)) - 0.5) * uNoise;
        finalColor += vec3(grain);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // Process our RGB values
    const rgbColor1 = hexToRgb(gradientColors[0]);
    const rgbColor2 = hexToRgb(gradientColors[1]);
    const rgbAccent = hexToRgb(accentColor);

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uResolution: { value: [gl.canvas.width, gl.canvas.height] },
        uMouse: { value: [0.5, 0.5] },
        uTime: { value: 0 },
        uColor1: { value: rgbColor1 },
        uColor2: { value: rgbColor2 },
        uColorAccent: { value: rgbAccent },
        uBlindCount: { value: blindCount },
        uNoise: { value: noise },
        uSpotlightRadius: { value: spotlightRadius },
        uSpotlightSoftness: { value: spotlightSoftness },
        uSpotlightOpacity: { value: spotlightOpacity },
        uDistortAmount: { value: distortAmount },
      },
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new Mesh(gl, { geometry, program });

    // Handle mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      // Invert Y to match GL coords
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      targetMouseRef.current = { x, y };
    };

    // Touch support for screen-reactive touch
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = container.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) / rect.width;
        const y = 1.0 - (touch.clientY - rect.top) / rect.height;
        targetMouseRef.current = { x, y };
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    // Handle canvas resizing
    let width = container.clientWidth;
    let height = container.clientHeight;
    renderer.setSize(width, height);
    program.uniforms.uResolution.value = [width, height];

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          const contentBox = entry.contentBoxSize[0];
          width = Math.floor(contentBox.inlineSize);
          height = Math.floor(contentBox.blockSize);
        } else {
          width = Math.floor(entry.contentRect.width);
          height = Math.floor(entry.contentRect.height);
        }
        renderer.setSize(width, height);
        program.uniforms.uResolution.value = [width, height];
      }
    });
    resizeObserver.observe(container);

    // Animation variables
    let animationId: number;
    let lastTime = performance.now();

    const renderLoop = (now: number) => {
      animationId = requestAnimationFrame(renderLoop);

      // Mouse position smoothing with dampening
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * mouseDampening;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * mouseDampening;

      program.uniforms.uMouse.value = [mouseRef.current.x, mouseRef.current.y];
      program.uniforms.uTime.value = (now - lastTime) / 1000;

      renderer.render({ scene: mesh });
    };

    animationId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      resizeObserver.disconnect();
    };
  }, [
    gradientColors,
    blindCount,
    noise,
    mouseDampening,
    spotlightRadius,
    spotlightSoftness,
    spotlightOpacity,
    distortAmount,
  ]);

  return (
    <div id="gradient-blinds-wrapper" ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      <canvas id="gradient-blinds-canvas" ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
