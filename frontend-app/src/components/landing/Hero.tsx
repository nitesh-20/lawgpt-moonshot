import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useTransform,
  useScroll,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import SplitType from "split-type";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useMouseTilt } from "@/hooks/useMouseTilt";
import { MagneticButton, CursorGlow, FloatingCard } from "./shared";
import justiceLady from "@/assets/justice-lady.png";
import supremeCourt from "@/assets/supreme-court.png";

const ORBIT_CARDS = [
  { title: "AI Drafting", top: 2, left: 8 },
  { title: "Compliance Check", top: 2, left: 92 },
  { title: "Research Agent", top: 24, left: -4 },
  { title: "Document Review", top: 20, left: 104 },
  { title: "Contract Analysis", top: 50, left: -8 },
  { title: "Risk Detection", top: 50, left: 108 },
  { title: "Legal Research", top: 82, left: 2 },
  { title: "Citation Check", top: 78, left: 98 },
];

// Statue "AI core" anchor — connection rays originate from its edge, not one shared point.
const CORE = { x: 50, y: 48 };
const CORE_RADIUS = 9;
const EDGE_INSET = 7;

const CONNECTIONS = ORBIT_CARDS.map((card, i) => {
  const dx = card.left - CORE.x;
  const dy = card.top - CORE.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const start = { x: CORE.x + ux * CORE_RADIUS, y: CORE.y + uy * CORE_RADIUS };
  const end = { x: card.left - ux * EDGE_INSET, y: card.top - uy * EDGE_INSET };
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const curveSign = i % 2 === 0 ? 1 : -1;
  const curveAmount = 6 + (i % 3) * 2;
  const control = {
    x: mid.x + -uy * curveAmount * curveSign,
    y: mid.y + ux * curveAmount * curveSign,
  };
  return {
    title: card.title,
    start,
    end,
    control,
    duration: 2.4 + (i % 4) * 0.4,
    delay: i * 0.25,
  };
});

const CYCLE_WORDS = ["Built for Lawyers.", "Built for India.", "Built for Enterprises.", "Built for Everyone."];


const Hero = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const statueRef = useRef<HTMLDivElement>(null);
  const courtRef = useRef<HTMLDivElement>(null);
  const { x: tiltX, y: tiltY } = useMouseTilt();
  const [wordIndex, setWordIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const rotateY = useTransform(tiltX, [-1, 1], [-10, 10]);
  const rotateX = useTransform(tiltY, [-1, 1], [8, -8]);
  const heroRotateY = useTransform(tiltX, [-1, 1], [-2, 2]);
  const heroRotateX = useTransform(tiltY, [-1, 1], [1.5, -1.5]);
  const courtX = useTransform(tiltX, [-1, 1], [-6, 6]);
  const courtY = useTransform(tiltY, [-1, 1], [-4, 4]);
  const courtRotate = useTransform(tiltX, [-1, 1], [-0.25, 0.25]);
  const glowOpacity = useTransform([tiltX, tiltY], (values) => {
    const [vx, vy] = values as number[];
    const proximity = 1 - Math.min(1, Math.hypot(vx, vy));
    return 0.35 + proximity * 0.4;
  });

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const cardsOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    if (!headingRef.current) return;

    if (reduceMotion) {
      headingRef.current.style.opacity = "1";
      return;
    }

    const split = new SplitType(headingRef.current, { types: "words,chars" });
    gsap.set(split.chars, { opacity: 0, yPercent: 100 });
    gsap.to(split.chars, {
      opacity: 1,
      yPercent: 0,
      duration: 1,
      ease: "power3.out",
      stagger: 0.018,
      delay: 0.2,
    });

    return () => split.revert();
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !statueRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(statueRef.current, {
        yPercent: 14,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });

      if (courtRef.current) {
        gsap.to(courtRef.current, {
          yPercent: 6,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      }
    });

    return () => ctx.revert();
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => setWordIndex((i) => (i + 1) % CYCLE_WORDS.length), 2600);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  return (
    <section
      ref={sectionRef}
      id="platform"
      className="relative min-h-screen overflow-hidden bg-[#050506]"
      style={{ perspective: "1400px" }}
    >
      <CursorGlow />

      <div className="lv-noise pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(248,248,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(248,248,246,0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)",
        }}
        aria-hidden="true"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[2%] w-[92vw] max-w-[1700px] -translate-x-1/2"
      >
        <motion.div
          ref={courtRef}
          className="transform-gpu"
          style={{ x: reduceMotion ? 0 : courtX, y: reduceMotion ? 0 : courtY, rotate: reduceMotion ? 0 : courtRotate }}
        >
          <img
            src={supremeCourt}
            alt=""
            className="h-auto w-full select-none"
            style={{
              opacity: 0.3,
              filter: "blur(3px) saturate(75%) brightness(65%)",
              mixBlendMode: "screen",
              maskImage: "radial-gradient(ellipse 62% 58% at 50% 38%, black 35%, transparent 82%)",
              WebkitMaskImage: "radial-gradient(ellipse 62% 58% at 50% 38%, black 35%, transparent 82%)",
            }}
          />
        </motion.div>
      </div>

      <div
        className="pointer-events-none absolute left-[8%] top-[10%] h-[420px] w-[420px] rounded-full opacity-60 [animation:lv-drift_18s_ease-in-out_infinite]"
        style={{ background: "radial-gradient(circle, rgba(109,93,246,0.18) 0%, transparent 70%)", filter: "blur(60px)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[6%] right-[10%] h-[380px] w-[380px] rounded-full opacity-50 [animation:lv-drift_22s_ease-in-out_infinite_reverse]"
        style={{ background: "radial-gradient(circle, rgba(110,150,255,0.15) 0%, transparent 70%)", filter: "blur(60px)" }}
        aria-hidden="true"
      />

      <motion.div
        style={{ rotateX: reduceMotion ? 0 : heroRotateX, rotateY: reduceMotion ? 0 : heroRotateY, transformStyle: "preserve-3d" }}
        className="relative mx-auto flex min-h-screen max-w-[1800px] transform-gpu flex-col items-center justify-center px-6 py-16 text-center lg:px-12 xl:px-20"
      >
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-[#A1A1AA]">
          AI-Native Legal Operating System
        </p>

        <h1
          ref={headingRef}
          className="max-w-4xl font-serif text-4xl leading-[0.95] tracking-tight text-[#F8F8F6] sm:text-6xl md:text-7xl lg:text-8xl"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          <span className="block">The Future of</span>
          <span className="block">Legal Intelligence</span>
        </h1>

        <div className="mt-4 h-8 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={wordIndex}
              initial={{ y: reduceMotion ? 0 : 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: reduceMotion ? 0 : -16, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg text-[#A1A1AA] md:text-xl"
            >
              {CYCLE_WORDS[wordIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-7 flex flex-col items-center gap-4 sm:flex-row">
          <MagneticButton
            onClick={() => navigate("/dashboard")}
            className="bg-[#6D5DF6] text-white shadow-[0_0_40px_rgba(109,93,246,0.4)] hover:shadow-[0_0_60px_rgba(109,93,246,0.6)]"
          >
            Start for free
          </MagneticButton>
          <MagneticButton
            onClick={() => navigate("/demo")}
            className="border border-white/15 bg-[rgba(255,255,255,0.04)] text-[#F8F8F6] backdrop-blur-xl hover:bg-[rgba(255,255,255,0.08)]"
          >
            Watch Demo
          </MagneticButton>
        </div>

        <div className="relative mt-4 flex h-[440px] w-full max-w-2xl items-center justify-center md:h-[600px] lg:h-[640px] lg:max-w-4xl xl:h-[680px] xl:max-w-[960px]">
          <svg
            className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible lg:block"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {CONNECTIONS.map((conn, i) => {
              const active = hoveredIndex === i;
              const d = `M ${conn.start.x} ${conn.start.y} Q ${conn.control.x} ${conn.control.y} ${conn.end.x} ${conn.end.y}`;
              return (
                <path
                  key={conn.title}
                  d={d}
                  fill="none"
                  strokeWidth={active ? 3 : 2.5}
                  strokeOpacity={active ? 0.75 : 0.65}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{
                    stroke: active ? "#3FBF7F" : "#2FA36B",
                    filter: active
                      ? "drop-shadow(0 0 4px rgba(63,191,127,0.15))"
                      : "drop-shadow(0 0 3px rgba(47,163,107,0.12))",
                    transition: "stroke 0.3s ease, stroke-width 0.3s ease, stroke-opacity 0.3s ease, filter 0.3s ease",
                  }}
                />
              );
            })}
          </svg>

          {CONNECTIONS.map((conn, i) => {
            const active = hoveredIndex === i;
            return (
              <div
                key={`${conn.title}-node`}
                className="pointer-events-none absolute hidden -translate-x-1/2 -translate-y-1/2 rounded-full lg:block"
                style={{
                  top: `${conn.end.y}%`,
                  left: `${conn.end.x}%`,
                  width: active ? 10 : 8,
                  height: active ? 10 : 8,
                  background: active ? "#3FBF7F" : "#2FA36B",
                  boxShadow: active
                    ? "0 0 10px 3px rgba(63,191,127,0.28)"
                    : "0 0 6px 2px rgba(47,163,107,0.18)",
                  transition: "width 0.3s ease, height 0.3s ease, box-shadow 0.3s ease",
                }}
              />
            );
          })}

          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute h-[400px] w-[400px] rounded-full transform-gpu md:h-[560px] md:w-[560px] lg:h-[620px] lg:w-[620px] xl:h-[680px] xl:w-[680px]"
            style={{
              opacity: reduceMotion ? 0.55 : glowOpacity,
              background: "radial-gradient(circle, rgba(109,93,246,0.5) 0%, rgba(110,150,255,0.16) 45%, transparent 75%)",
              filter: "blur(55px)",
            }}
          />

          <div
            className="relative [animation:lv-float_8s_ease-in-out_infinite]"
            style={reduceMotion ? { animation: "none" } : undefined}
          >
            <motion.div
              ref={statueRef}
              style={{ rotateY: reduceMotion ? 0 : rotateY, rotateX: reduceMotion ? 0 : rotateX, transformStyle: "preserve-3d" }}
              className="transform-gpu will-change-transform"
            >
              <img
                src={justiceLady}
                alt="Statue of Lady Justice, blindfolded and holding the scales"
                className="relative z-10 h-[410px] w-auto drop-shadow-[0_40px_80px_rgba(0,0,0,0.6)] md:h-[580px] xl:h-[620px]"
              />
            </motion.div>
          </div>

          <motion.div style={{ opacity: cardsOpacity }} className="contents">
            {[
              { title: "AI Drafting", status: "In Progress", floatDelay: 0.3, floatDuration: 7.8, ampX: -5, ampY: -10, rotateDeg: -1.4 },
              { title: "Compliance Check", status: "Passed", floatDelay: 1.6, floatDuration: 6.8, ampX: 6, ampY: -9, rotateDeg: 1.8 },
              { title: "Research Agent", status: "Running…", floatDelay: 0, floatDuration: 7, ampX: -7, ampY: -13, rotateDeg: -1.2 },
              { title: "Document Review", status: "Completed", floatDelay: 1.2, floatDuration: 8, ampX: 7, ampY: -12, rotateDeg: 1.5 },
              { title: "Contract Analysis", status: "92%", floatDelay: 0.6, floatDuration: 6.5, ampX: -6, ampY: 11, rotateDeg: -1.8 },
              { title: "Risk Detection", status: "3 Issues", floatDelay: 1.8, floatDuration: 9, ampX: 8, ampY: 10, rotateDeg: 2 },
              { title: "Legal Research", status: "127 Sources", floatDelay: 2.2, floatDuration: 7.2, ampX: -4, ampY: 14, rotateDeg: 1.1 },
              { title: "Citation Check", status: "Verified", floatDelay: 0.9, floatDuration: 8.4, ampX: 5, ampY: 13, rotateDeg: -1.6 },
            ].map((cardProps, i) => (
              <div
                key={cardProps.title}
                className="absolute hidden -translate-x-1/2 -translate-y-1/2 lg:block"
                style={{ top: `${ORBIT_CARDS[i].top}%`, left: `${ORBIT_CARDS[i].left}%` }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex((cur) => (cur === i ? null : cur))}
              >
                <FloatingCard {...cardProps} active={hoveredIndex === i} />
              </div>
            ))}
            <div className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 translate-y-[100px] lg:block">
              <FloatingCard title="Case Timeline" status="Updated" floatDelay={1.4} floatDuration={7.6} ampX={4} ampY={-8} rotateDeg={1} />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
