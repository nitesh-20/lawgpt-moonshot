import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion, AnimatePresence, useTransform } from "framer-motion";
import {
  BookOpenCheck,
  FileEdit,
  ShieldCheck,
  Gavel,
  ScanSearch,
  History,
} from "lucide-react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { MagneticButton } from "./shared";
import { useMouseTilt } from "@/hooks/useMouseTilt";
import { cn } from "@/lib/utils";
import uploadCard from "@/assets/upload.png";
import aiReadsCard from "@/assets/ai_reads.png";
import researchCard from "@/assets/research.png";
import draftCard from "@/assets/draft.png";
import reviewCard from "@/assets/review.png";
import doneCard from "@/assets/done.png";

const WORKSPACE_CARDS = [
  {
    title: "Research Panel",
    status: "Live",
    dot: "#46B87B",
    top: "2%",
    left: "0%",
    initial: { x: 160, y: 50 },
  },
  {
    title: "Timeline",
    status: "Synced",
    dot: "#6D5DF6",
    top: "2%",
    left: "100%",
    initial: { x: -160, y: 50 },
  },
  {
    title: "Knowledge Graph",
    status: "Mapped",
    dot: "#46B87B",
    top: "50%",
    left: "0%",
    initial: { x: 140, y: -80 },
  },
  {
    title: "Voice Assistant",
    status: "Listening",
    dot: "#46B87B",
    top: "50%",
    left: "100%",
    initial: { x: -140, y: -80 },
  },
  {
    title: "Document Viewer",
    status: "Open",
    dot: "#A1A1AA",
    top: "98%",
    left: "0%",
    initial: { x: 110, y: -25 },
  },
  {
    title: "Matter Management",
    status: "Active",
    dot: "#46B87B",
    top: "98%",
    left: "100%",
    initial: { x: -110, y: -25 },
  },
];

const WORKSPACE_DRIFT = [-10, -18, -14, -22, -12, -20];

// Slow, capped increment — reads as "live" without ever flashing or drawing attention.
const useTicker = (start: number, max: number, intervalMs: number, reduceMotion: boolean) => {
  const [value, setValue] = useState(start);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setValue((v) => (v >= max ? start : v + 1)), intervalMs);
    return () => clearInterval(id);
  }, [reduceMotion, start, max, intervalMs]);
  return value;
};

const ScanDots = () => (
  <span className="inline-flex gap-[3px]" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="h-1 w-1 rounded-full bg-[#46B87B]/70"
        animate={{ opacity: [0.25, 1, 0.25] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
      />
    ))}
  </span>
);

const Waveform = () => (
  <span className="inline-flex items-end gap-[2px]" aria-hidden="true">
    {[5, 9, 6, 11, 5].map((h, i) => (
      <motion.span
        key={i}
        className="w-[2px] origin-bottom rounded-full bg-[#46B87B]/70"
        style={{ height: h }}
        animate={{ scaleY: [0.4, 1, 0.4] }}
        transition={{ duration: 1.1 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
      />
    ))}
  </span>
);

const WorkspaceCardBody = ({
  card,
  reduceMotion,
}: {
  card: (typeof WORKSPACE_CARDS)[number];
  reduceMotion: boolean;
}) => {
  const sources = useTicker(127, 133, 3200, reduceMotion);
  const updates = useTicker(12, 16, 3800, reduceMotion);
  const nodes = useTicker(2481, 2489, 2600, reduceMotion);

  let meta: ReactNode = null;
  let sub: ReactNode = null;

  switch (card.title) {
    case "Research Panel":
      meta = `Searching ${sources} legal sources`;
      sub = "3 active agents";
      break;
    case "Timeline":
      meta = `${updates} updates`;
      sub = "2 pending actions";
      break;
    case "Knowledge Graph":
      meta = `${nodes.toLocaleString()} nodes indexed`;
      break;
    case "Voice Assistant":
      meta = "Hindi + English";
      sub = (
        <span className="inline-flex items-center gap-2">
          Low latency
          <Waveform />
        </span>
      );
      break;
    case "Document Viewer":
      meta = "Last opened:";
      sub = "Contract.pdf";
      break;
    case "Matter Management":
      meta = "3 ongoing matters";
      break;
  }

  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-widest text-[#A1A1AA]">{card.title}</p>
      <div className="mt-2.5 flex items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: card.dot }}
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-[#F8F8F6]">{card.status}</p>
        {card.title === "Research Panel" && <ScanDots />}
      </div>
      {meta && <p className="mt-2 text-[11px] leading-relaxed text-[#A1A1AA]">{meta}</p>}
      {sub && <p className="mt-1 text-[11px] leading-relaxed text-[#A1A1AA]/80">{sub}</p>}
    </>
  );
};

export const AIWorkspace = () => {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollDriftRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardVisualRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const linesWrapRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { x: tiltX, y: tiltY } = useMouseTilt();
  const workspaceParallaxX = useTransform(tiltX, [-1, 1], [-2, 2]);
  const workspaceParallaxY = useTransform(tiltY, [-1, 1], [-2, 2]);
  const cardsParallaxX = useTransform(tiltX, [-1, 1], [-7, 7]);
  const cardsParallaxY = useTransform(tiltY, [-1, 1], [-7, 7]);

  // Entrance + continuous scroll drift.
  useEffect(() => {
    if (reduceMotion || !sectionRef.current || !mockupRef.current) return;
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];

    const ctx = gsap.context(() => {
      gsap.set(mockupRef.current, { opacity: 0, scale: 0.85 });
      gsap.set(linesWrapRef.current, { opacity: 0 });
      cards.forEach((card, i) => {
        gsap.set(card, { opacity: 0, x: WORKSPACE_CARDS[i].initial.x, y: WORKSPACE_CARDS[i].initial.y });
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=140%",
          scrub: 1,
          pin: true,
        },
      });

      // Workspace appears first, then connection lines fade in, then cards travel
      // outward along those lines toward their final positions.
      tl.to(mockupRef.current, { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" });
      tl.to(linesWrapRef.current, { opacity: 1, duration: 0.3, ease: "power2.out" }, "-=0.2");
      tl.to(cards, { opacity: 1, x: 0, y: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }, "-=0.1");

      // Workspace + cards keep drifting upward at different rates for the rest of the scroll —
      // separate elements/props from the entrance tweens above, so nothing collides.
      tl.to(mockupRef.current, { y: -14, ease: "none", duration: 1.4 }, 0);
      scrollDriftRefs.current.forEach((el, i) => {
        if (!el) return;
        tl.to(el, { y: WORKSPACE_DRIFT[i], ease: "none", duration: 1.4 }, 0);
      });
    });

    return () => ctx.revert();
  }, [reduceMotion]);

  // Every frame: measure the workspace + each card, redraw the Bézier connections so they
  // never detach regardless of what's moving them (entrance, scroll drift, parallax, idle float).
  useEffect(() => {
    const container = containerRef.current;
    const core = mockupRef.current;
    if (!container || !core) return;

    let frame: number;

    const tick = () => {
      const containerRect = container.getBoundingClientRect();
      const coreRect = core.getBoundingClientRect();
      const coreCenter = {
        x: coreRect.left + coreRect.width / 2 - containerRect.left,
        y: coreRect.top + coreRect.height / 2 - containerRect.top,
      };

      WORKSPACE_CARDS.forEach((_, i) => {
        const cardEl = cardVisualRefs.current[i];
        const pathEl = pathRefs.current[i];
        if (!cardEl || !pathEl) return;

        const r = cardEl.getBoundingClientRect();
        const cardCenter = {
          x: r.left + r.width / 2 - containerRect.left,
          y: r.top + r.height / 2 - containerRect.top,
        };

        const dx = cardCenter.x - coreCenter.x;
        const dy = cardCenter.y - coreCenter.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;

        const tCore = Math.min(
          ux !== 0 ? coreRect.width / 2 / Math.abs(ux) : Infinity,
          uy !== 0 ? coreRect.height / 2 / Math.abs(uy) : Infinity
        );
        const start = { x: coreCenter.x + ux * tCore, y: coreCenter.y + uy * tCore };

        const tCard = Math.min(
          ux !== 0 ? r.width / 2 / Math.abs(ux) : Infinity,
          uy !== 0 ? r.height / 2 / Math.abs(uy) : Infinity
        );
        const end = { x: cardCenter.x - ux * tCard, y: cardCenter.y - uy * tCard };

        const px = -uy;
        const py = ux;
        const curve = 26 + (i % 3) * 12;
        const sign = i % 2 === 0 ? 1 : -1;
        const c1 = { x: start.x + ux * len * 0.3 + px * curve * sign, y: start.y + uy * len * 0.3 + py * curve * sign };
        const c2 = { x: end.x - ux * len * 0.3 + px * curve * sign, y: end.y - uy * len * 0.3 + py * curve * sign };

        pathEl.setAttribute("d", `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`);

        const nodeEl = nodeRefs.current[i];
        if (nodeEl) {
          nodeEl.style.transform = `translate3d(${end.x}px, ${end.y}px, 0) translate(-50%, -50%)`;
        }
      });

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="workspace"
      className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-[#050506] px-6 lg:px-10 xl:px-16"
    >
      <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-[#A1A1AA]">AI Workspace</p>
      <h2
        className="mb-16 max-w-2xl text-balance text-center font-serif text-4xl text-[#F8F8F6] md:text-5xl"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        Every agent, one workspace.
      </h2>

      <div ref={containerRef} className="relative h-[440px] w-full max-w-5xl lg:h-[520px] lg:max-w-6xl xl:h-[600px] xl:max-w-7xl">
        <div ref={linesWrapRef} className="pointer-events-none absolute inset-0">
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {WORKSPACE_CARDS.map((card, i) => {
              const active = hoveredIndex === i;
              return (
                <path
                  key={card.title}
                  ref={(el) => (pathRefs.current[i] = el)}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    stroke: active ? "#3FBF7F" : "#2FA36B",
                    strokeWidth: active ? 3 : 2.5,
                    strokeOpacity: active ? 0.75 : 0.65,
                    filter: active
                      ? "drop-shadow(0 0 4px rgba(63,191,127,0.15))"
                      : "drop-shadow(0 0 3px rgba(47,163,107,0.12))",
                    transition: "stroke 0.3s ease, stroke-width 0.3s ease, stroke-opacity 0.3s ease, filter 0.3s ease",
                  }}
                />
              );
            })}
          </svg>

          {WORKSPACE_CARDS.map((card, i) => {
            const active = hoveredIndex === i;
            return (
              <div
                key={`${card.title}-node`}
                ref={(el) => (nodeRefs.current[i] = el)}
                className="pointer-events-none absolute left-0 top-0 z-10 hidden rounded-full lg:block"
                style={{
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
        </div>

        <div
          ref={mockupRef}
          className="absolute left-1/2 top-1/2 z-10 w-full max-w-[525px] -translate-x-1/2 -translate-y-1/2 transform-gpu rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl md:max-w-[600px] lg:max-w-[675px] xl:max-w-[790px]"
        >
          <motion.div style={{ x: workspaceParallaxX, y: workspaceParallaxY }} className="transform-gpu">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-white/20" />
              <span className="h-3 w-3 rounded-full bg-white/20" />
              <span className="h-3 w-3 rounded-full bg-white/20" />
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-5">
              <div className="space-y-2.5">
                {["Cases", "Research", "Drafts", "Agents"].map((item) => (
                  <div key={item} className="rounded-md bg-white/5 px-2.5 py-2 text-[13px] text-[#A1A1AA]">
                    {item}
                  </div>
                ))}
              </div>
              <div className="space-y-2.5">
                <div className="h-3.5 w-3/4 rounded bg-white/10" />
                <div className="h-3.5 w-full rounded bg-white/10" />
                <div className="h-3.5 w-5/6 rounded bg-white/10" />
                <div className="mt-3.5 flex items-end gap-2">
                  {[40, 70, 55, 90, 65, 80].map((h, i) => (
                    <div key={i} className="w-3.5 rounded-t bg-[#6D5DF6]/60" style={{ height: `${h * 0.47}px` }} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {WORKSPACE_CARDS.map((card, i) => (
          <div
            key={card.title}
            ref={(el) => (cardRefs.current[i] = el)}
            className="absolute z-20 hidden -translate-x-1/2 -translate-y-1/2 transform-gpu lg:block"
            style={{ top: card.top, left: card.left }}
          >
            <div ref={(el) => (scrollDriftRefs.current[i] = el)} className="transform-gpu">
              <motion.div style={{ x: cardsParallaxX, y: cardsParallaxY }} className="transform-gpu">
                <div
                  className="transform-gpu [animation:lv-float_var(--lv-float-duration)_ease-in-out_infinite]"
                  style={{
                    ["--lv-float-duration" as string]: `${6 + (i % 3)}s`,
                    ["--lv-amp-x" as string]: `${(i % 2 === 0 ? 1 : -1) * (4 + (i % 3) * 2)}px`,
                    ["--lv-amp-y" as string]: `${(i % 2 === 0 ? -1 : 1) * (6 + (i % 2) * 3)}px`,
                    ["--lv-rot" as string]: "0deg",
                    animationDelay: `${i * 0.3}s`,
                  }}
                >
                  <motion.div
                    ref={(el) => (cardVisualRefs.current[i] = el)}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex((cur) => (cur === i ? null : cur))}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={cn(
                      "w-[216px] rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300",
                      hoveredIndex === i && "border-[#46B87B]/50 shadow-[0_26px_60px_rgba(0,0,0,0.55),0_0_16px_rgba(70,184,123,0.18)]"
                    )}
                  >
                    <WorkspaceCardBody card={card} reduceMotion={!!reduceMotion} />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const CAPABILITIES = [
  {
    icon: BookOpenCheck,
    title: "Legal Research",
    blurb: "Statutes, case law, and precedent in seconds.",
    detail: "Cross-references the Constitution, Supreme Court, and High Court judgments for every query, ranked by relevance to the matter at hand.",
  },
  {
    icon: FileEdit,
    title: "Contract Drafting",
    blurb: "Grounded in your case record.",
    detail: "Generates clauses from prior filings and firm templates, ready for partner review rather than a blank page.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance",
    blurb: "Checked against regulation before it ships.",
    detail: "Flags gaps against the BNS, BSA, and sector-specific regulatory frameworks automatically, before a document leaves your desk.",
  },
  {
    icon: Gavel,
    title: "Risk Analysis",
    blurb: "Uncapped liability, found early.",
    detail: "Surfaces high-exposure clauses and indemnity gaps before signature, not after.",
  },
  {
    icon: ScanSearch,
    title: "Document Intelligence",
    blurb: "Every clause, indexed and searchable.",
    detail: "OCR and structure extraction turn scanned filings into a searchable, structured case record.",
  },
  {
    icon: History,
    title: "Case Timeline",
    blurb: "What happened, and what's next.",
    detail: "A living chronology of filings, hearings, and deadlines, updated automatically as the matter moves.",
  },
];

const CapabilityCard = ({ item }: { item: (typeof CAPABILITIES)[number] }) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = item.icon;

  return (
    <motion.div
      layout
      onHoverStart={() => setExpanded(true)}
      onHoverEnd={() => setExpanded(false)}
      transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
      className="transform-gpu rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-6 backdrop-blur-xl lg:p-8"
    >
      <motion.div layout="position" className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[#6D5DF6]" strokeWidth={1.75} />
        <h3 className="text-lg font-medium text-[#F8F8F6]">{item.title}</h3>
      </motion.div>
      <motion.p layout="position" className="mt-3 text-sm leading-relaxed text-[#A1A1AA]">
        {item.blurb}
      </motion.p>
      <AnimatePresence>
        {expanded && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 overflow-hidden text-sm leading-relaxed text-[#F8F8F6]/80"
          >
            {item.detail}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const Capabilities = () => (
  <section id="capabilities" className="relative bg-[#050506] px-6 py-24 md:py-28 lg:px-10 xl:px-16">
    <div className="mx-auto max-w-7xl xl:max-w-[1400px]">
      <h2
        className="mb-16 text-balance text-center font-serif text-4xl leading-[1.05] text-[#F8F8F6] md:text-6xl"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        Not another chatbot.
        <br />
        An operating system.
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {CAPABILITIES.map((item) => (
          <CapabilityCard key={item.title} item={item} />
        ))}
      </div>
    </div>
  </section>
);

const CITATIONS = [
  "Constitution",
  "Supreme Court",
  "High Court",
  "BNS",
  "BSA",
  "Bare Acts",
  "Consumer Protection Act",
  "Companies Act",
  "Income Tax Act",
  "GST Act",
  "Evidence Act",
  "Criminal Procedure",
  "Civil Procedure Code",
  "Arbitration Act",
  "Competition Act",
  "Labour Code",
  "IT Act",
  "Data Protection Act",
  "Environmental Law",
  "Family Law",
  "Property Law",
  "Contract Law",
  "IPR",
  "Trademark",
  "Patent",
  "Copyright",
  "SEBI Regulations",
  "RBI Guidelines",
  "NCLT",
  "Supreme Court",
  "High Court",
  "Constitution",
];

const TICKER_SPEED_PX_PER_SEC = 70;
const MIN_LAPS_VIEWPORT_COVERAGE = 4;
const MAX_TICKER_COPIES = 12;

const CitationTicker = () => {
  const reduceMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const halfRef = useRef<HTMLDivElement>(null);
  const secondHalfRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const [copies, setCopies] = useState(2);

  // Dynamically grow the sequence until one lap covers several viewport widths,
  // so there is always far more content than the visible area on any screen.
  useEffect(() => {
    const half = halfRef.current;
    const viewport = viewportRef.current;
    if (!half || !viewport) return;

    const halfWidth = half.scrollWidth;
    const viewportWidth = viewport.clientWidth || window.innerWidth;

    if (halfWidth > 0 && halfWidth < viewportWidth * MIN_LAPS_VIEWPORT_COVERAGE && copies < MAX_TICKER_COPIES) {
      setCopies((c) => c + 1);
    }
  }, [copies]);

  useEffect(() => {
    const handleResize = () => {
      const half = halfRef.current;
      const viewport = viewportRef.current;
      if (!half || !viewport) return;
      const halfWidth = half.scrollWidth;
      const viewportWidth = viewport.clientWidth || window.innerWidth;
      if (halfWidth < viewportWidth * MIN_LAPS_VIEWPORT_COVERAGE && copies < MAX_TICKER_COPIES) {
        setCopies((c) => Math.min(c + 1, MAX_TICKER_COPIES));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [copies]);

  useEffect(() => {
    if (reduceMotion || !trackRef.current || !secondHalfRef.current) return;

    gsap.set(trackRef.current, { x: 0 });
    // Exact pixel distance from the start of the first sequence to the start
    // of its identical duplicate — the true seamless loop period. Using the
    // measured gap-inclusive offset (not scrollWidth alone) avoids the
    // off-by-one-gap jump a naive "half the track" measurement would produce.
    const distance =
      secondHalfRef.current.getBoundingClientRect().left - trackRef.current.getBoundingClientRect().left;
    if (distance <= 0) return;

    tweenRef.current?.kill();
    tweenRef.current = gsap.to(trackRef.current, {
      x: -distance,
      ease: "none",
      duration: distance / TICKER_SPEED_PX_PER_SEC,
      repeat: -1,
      force3D: true,
    });

    return () => {
      tweenRef.current?.kill();
    };
  }, [reduceMotion, copies]);

  const sequence = Array.from({ length: copies }, () => CITATIONS).flat();

  const renderChips = (half: "a" | "b") =>
    sequence.map((label, i) => (
      <div
        key={`${half}-${i}`}
        className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-6 py-3 text-sm text-[#A1A1AA] backdrop-blur-xl"
      >
        {label}
      </div>
    ));

  return (
    <div
      ref={viewportRef}
      className="relative overflow-hidden"
      onMouseEnter={() => tweenRef.current?.pause()}
      onMouseLeave={() => tweenRef.current?.play()}
    >
      <div ref={trackRef} className="flex w-max gap-4 transform-gpu will-change-transform">
        <div ref={halfRef} className="flex shrink-0 gap-4">
          {renderChips("a")}
        </div>
        <div ref={secondHalfRef} aria-hidden="true" className="flex shrink-0 gap-4">
          {renderChips("b")}
        </div>
      </div>
    </div>
  );
};

export const Trust = () => (
  <section id="trust" className="relative overflow-hidden bg-[#050506] py-24 md:py-28">
    <div className="mx-auto max-w-4xl px-6 text-center">
      <h2
        className="mb-16 text-balance font-serif text-4xl text-[#F8F8F6] md:text-6xl"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        Every answer backed by law.
      </h2>
    </div>
    <CitationTicker />
  </section>
);

const WORKFLOW_STEPS = [
  { label: "Upload", image: uploadCard },
  { label: "AI Reads", image: aiReadsCard },
  { label: "Research", image: researchCard },
  { label: "Draft", image: draftCard },
  { label: "Review", image: reviewCard },
  { label: "Done", image: doneCard },
];

const cardVariants = {
  initial: { opacity: 0, y: 40, scale: 0.98, filter: "blur(8px)" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.98,
    filter: "blur(8px)",
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const STEP_COUNT = WORKFLOW_STEPS.length;

export const Workflow = () => {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [scrollStep, setScrollStep] = useState(0);
  const [isFinal, setIsFinal] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const isPinnedRef = useRef(false);

  const activeStep = hoveredStep ?? scrollStep;

  useEffect(() => {
    if (reduceMotion || !sectionRef.current || !lineRef.current) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: () => `+=${window.innerHeight * 3}`,
        scrub: true,
        pin: true,
        snap: {
          snapTo: 1 / (STEP_COUNT - 1),
          duration: 0.3,
          ease: "power1.inOut",
        },
        onUpdate: (self) => {
          isPinnedRef.current = true;
          const progress = self.progress;
          const step = Math.min(STEP_COUNT - 1, Math.round(progress * (STEP_COUNT - 1)));
          setScrollStep(step);
          setIsFinal(progress >= 0.999);
          gsap.set(lineRef.current, { scaleX: progress });
        },
        onLeave: () => {
          isPinnedRef.current = false;
        },
        onEnterBack: () => {
          isPinnedRef.current = true;
        },
      });

      return () => trigger.kill();
    });

    return () => mm.revert();
  }, [reduceMotion]);

  return (
    <section
      ref={sectionRef}
      id="workflow"
      className="relative flex flex-col items-center justify-center overflow-hidden bg-[#050506] py-16 md:min-h-screen md:py-0"
    >
      <h2
        className="mb-12 text-balance text-center font-serif text-3xl text-[#F8F8F6] md:mb-16 md:text-5xl"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        From upload to filed, in one flow.
      </h2>

      <div className="relative w-full max-w-[1100px] px-[6vw] transform-gpu">
        {/* Node track: fixed-height row so the line's 50% is always the node's true center,
            independent of label height/wrapping below. */}
        <div className="relative flex h-5 w-full items-center justify-between gap-2 md:gap-0">
          <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/[0.12]" />
          <div
            ref={lineRef}
            className="absolute inset-x-0 top-1/2 h-[2px] origin-left -translate-y-1/2 scale-x-0 bg-[#6D5DF6] transform-gpu"
          />
          {WORKFLOW_STEPS.map((step, i) => {
            const isCompleted = i < scrollStep || (isFinal && i <= scrollStep);
            const isActive = activeStep === i;
            return (
              <div
                key={step.label}
                className="relative z-10 flex items-center justify-center outline-none"
                tabIndex={0}
                role="button"
                aria-pressed={isActive}
                onMouseEnter={() => isPinnedRef.current && setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
                onFocus={() => isPinnedRef.current && setHoveredStep(i)}
                onBlur={() => setHoveredStep(null)}
                id={`workflow-node-${i}`}
              >
                <motion.div
                  ref={(el) => (nodeRefs.current[i] = el as HTMLDivElement | null)}
                  className="h-4 w-4 rounded-full border-[3px] transform-gpu"
                  animate={{
                    scale: isActive ? 1.25 : 1,
                    backgroundColor: isCompleted || isActive ? "#6D5DF6" : "transparent",
                    borderColor: isCompleted || isActive ? "#6D5DF6" : "rgba(255,255,255,0.2)",
                    boxShadow: isActive
                      ? "0 0 18px 4px rgba(109,93,246,0.65)"
                      : isCompleted
                      ? "0 0 10px 2px rgba(109,93,246,0.35)"
                      : "0 0 0px 0px rgba(109,93,246,0)",
                  }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            );
          })}
        </div>

        {/* Labels row: mirrors the node row's spacing via the same justify-between distribution,
            kept structurally separate so it can never influence the line's vertical position. */}
        <div className="mt-4 flex w-full items-start justify-between gap-2 md:gap-0">
          {WORKFLOW_STEPS.map((step, i) => {
            const isCompleted = i < scrollStep || (isFinal && i <= scrollStep);
            const isActive = activeStep === i;
            return (
              <motion.span
                key={step.label}
                className="whitespace-nowrap text-center font-mono text-[11px] uppercase tracking-widest text-[#A1A1AA] md:text-sm"
                animate={{
                  color: isCompleted || isActive ? "#F8F8F6" : "#A1A1AA",
                  opacity: isCompleted || isActive ? 1 : 0.6,
                  fontWeight: isActive ? 600 : 500,
                }}
                transition={{ duration: 0.3 }}
              >
                {step.label}
              </motion.span>
            );
          })}
        </div>
      </div>

      <div className="relative mt-8 hidden h-[460px] w-full max-w-[1100px] items-center justify-center px-6 md:flex">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={WORKFLOW_STEPS[activeStep].label}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 flex items-center justify-center transform-gpu will-change-transform"
          >
            <div className="relative">
              <div
                className="pointer-events-none absolute -inset-10 -z-10 rounded-[40px] opacity-60"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(109,93,246,0.35) 0%, transparent 70%)",
                  filter: "blur(40px)",
                }}
                aria-hidden="true"
              />
              <img
                src={WORKFLOW_STEPS[activeStep].image}
                alt={`${WORKFLOW_STEPS[activeStep].label} preview`}
                className="max-h-[460px] w-auto max-w-[1080px] rounded-2xl object-contain shadow-[0_30px_80px_rgba(0,0,0,0.55)] transform-gpu"
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile: cards fade in as the user scrolls past, no pin */}
      <div className="mt-12 flex w-full flex-col gap-16 px-6 md:hidden">
        {WORKFLOW_STEPS.map((step) => (
          <motion.div
            key={step.label}
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="font-mono text-xs uppercase tracking-widest text-[#F8F8F6]">
              {step.label}
            </span>
            <img
              src={step.image}
              alt={`${step.label} preview`}
              className="w-full max-w-[420px] rounded-2xl object-contain shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const FOOTER_COLUMNS = [
  { title: "Product", links: ["Platform", "Features", "Enterprise", "Pricing"] },
  { title: "Resources", links: ["Documentation", "API", "Guides"] },
  { title: "Company", links: ["About", "Blog", "Careers"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security"] },
];

export const FinalCTA = () => {
  const navigate = useNavigate();

  return (
    <section id="cta" className="relative overflow-hidden bg-[#050506] px-6 pt-12 pb-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(248,248,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(248,248,246,0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 rounded-full opacity-40"
        style={{ background: "radial-gradient(circle, rgba(109,93,246,0.25) 0%, transparent 70%)", filter: "blur(70px)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <h2
          className="mb-10 text-balance font-serif text-5xl leading-[1.02] text-[#F8F8F6] md:text-7xl"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          The future of law starts here.
        </h2>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
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
            Book a demo
          </MagneticButton>
        </div>
      </div>

      <footer className="relative mx-auto mt-24 max-w-6xl border-t border-white/10 pt-12 xl:max-w-[1300px]">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 text-sm font-medium text-[#F8F8F6]">{col.title}</h3>
              <ul className="space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-[#A1A1AA] transition-colors hover:text-[#F8F8F6]">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 pb-4 text-sm text-[#A1A1AA] md:flex-row">
          <p>© 2026 LawGPT. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="transition-colors hover:text-[#F8F8F6]">Twitter</a>
            <a href="#" className="transition-colors hover:text-[#F8F8F6]">LinkedIn</a>
            <a href="#" className="transition-colors hover:text-[#F8F8F6]">GitHub</a>
          </div>
        </div>
      </footer>
    </section>
  );
};
