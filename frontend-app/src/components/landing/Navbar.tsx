import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";

const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "Features", href: "#capabilities" },
  { label: "Enterprise", href: "#trust" },
  { label: "Pricing", href: "#workflow" },
  { label: "Docs", href: "#" },
];

const Navbar = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const [shrunk, setShrunk] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setShrunk(latest > 40);
  });

  useEffect(() => {
    setShrunk(window.scrollY > 40);
  }, []);

  return (
    <motion.nav
      className="fixed inset-x-0 top-0 z-40 flex justify-center transform-gpu"
      initial={false}
      animate={{ paddingTop: shrunk ? "10px" : "20px", paddingBottom: shrunk ? "10px" : "20px" }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        animate={{
          width: shrunk ? "min(760px, 92vw)" : "min(1180px, 94vw)",
          backgroundColor: shrunk ? "rgba(5,5,6,0.7)" : "rgba(5,5,6,0.3)",
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between rounded-full border border-white/10 px-6 py-3 backdrop-blur-xl"
      >
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <span className="font-serif text-lg text-[#F8F8F6]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            LawGPT
          </span>
        </button>

        <div className="hidden items-center gap-7 text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[#A1A1AA] transition-colors duration-200 hover:text-[#F8F8F6]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="rounded-full bg-[#6D5DF6] px-5 py-2 text-sm font-medium text-white shadow-[0_0_24px_rgba(109,93,246,0.35)] transition-transform duration-150 ease-out active:scale-[0.97] hover:shadow-[0_0_36px_rgba(109,93,246,0.5)]"
        >
          Start for free
        </button>
      </motion.div>
    </motion.nav>
  );
};

export default Navbar;
