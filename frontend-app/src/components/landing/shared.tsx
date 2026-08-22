import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

const isFinePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const MagneticButton = ({ children, className, onClick }: MagneticButtonProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.3 });
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.3 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFinePointer() || prefersReducedMotion()) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - (rect.left + rect.width / 2)) * 0.35);
    y.set((e.clientY - (rect.top + rect.height / 2)) * 0.35);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className="inline-block transform-gpu [will-change:transform]"
    >
      <motion.button
        onClick={onClick}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-medium",
          className
        )}
      >
        {children}
      </motion.button>
    </motion.div>
  );
};

export const CursorGlow = () => {
  const x = useMotionValue(-500);
  const y = useMotionValue(-500);
  const springX = useSpring(x, { stiffness: 120, damping: 22, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 120, damping: 22, mass: 0.5 });

  useState(() => {
    if (typeof window === "undefined" || !isFinePointer() || prefersReducedMotion()) return;
    const handle = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  });

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-30 hidden h-[460px] w-[460px] rounded-full transform-gpu md:block"
      style={{
        x: springX,
        y: springY,
        translateX: "-50%",
        translateY: "-50%",
        background: "radial-gradient(circle, rgba(110,150,255,0.15) 0%, rgba(110,150,255,0) 70%)",
        filter: "blur(40px)",
      }}
    />
  );
};

interface FloatingCardProps {
  title: string;
  status: string;
  className?: string;
  floatDelay?: number;
  floatDuration?: number;
  ampX?: number;
  ampY?: number;
  rotateDeg?: number;
  active?: boolean;
}

export const FloatingCard = ({
  title,
  status,
  className,
  floatDelay = 0,
  floatDuration = 7,
  ampX = 6,
  ampY = -12,
  rotateDeg = 1.5,
  active = false,
}: FloatingCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFinePointer()) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -10, y: px * 10 });
  };

  return (
    <div
      className="pointer-events-auto [animation:lv-float_var(--lv-float-duration)_ease-in-out_infinite]"
      style={{
        ["--lv-float-duration" as string]: `${floatDuration}s`,
        ["--lv-amp-x" as string]: `${ampX}px`,
        ["--lv-amp-y" as string]: `${ampY}px`,
        ["--lv-rot" as string]: `${rotateDeg}deg`,
        animationDelay: `${floatDelay}s`,
      }}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ transformStyle: "preserve-3d" }}
        className={cn(
          "transform-gpu rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-[box-shadow,border-color] duration-300",
          active && "border-[#46B87B]/50 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_20px_rgba(70,184,123,0.18)]",
          className
        )}
      >
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#A1A1AA]">{title}</p>
        <p className="mt-1 text-sm font-medium text-[#F8F8F6]">{status}</p>
      </motion.div>
    </div>
  );
};
