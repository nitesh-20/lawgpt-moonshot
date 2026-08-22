import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { 
  LayoutGrid, 
  FileText, 
  Search, 
  FolderOpen, 
  FileEdit, 
  Shield, 
  Bot, 
  Cpu, 
  Sparkles,
  Volume2,
  Mic
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <Command.Dialog
          open={open}
          onOpenChange={setOpen}
          label="Command Menu"
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-neutral-900/25 backdrop-blur-xs"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full max-w-[640px] bg-white border border-border rounded-xl shadow-2xl overflow-hidden"
          >
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="h-5 w-5 text-neutral-400 mr-3" />
          <Command.Input
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-neutral-50 px-1.5 font-mono text-[10px] font-medium text-neutral-500 ml-auto">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto p-2 space-y-1">
          <Command.Empty className="py-6 text-center text-xs text-neutral-500">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation" className="text-[10px] font-semibold tracking-wider text-neutral-400 px-3 py-1.5 uppercase">
            <Command.Item
              onSelect={() => runCommand(() => navigate("/dashboard"))}
              className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-700 hover:text-primary rounded hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/cases"))}
              className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-700 hover:text-primary rounded hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
            >
              <FileText className="h-4 w-4" />
              <span>Go to Cases</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/search"))}
              className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-700 hover:text-primary rounded hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
            >
              <Search className="h-4 w-4" />
              <span>Go to Legal Search</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/documents"))}
              className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-700 hover:text-primary rounded hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Go to Documents</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/drafting"))}
              className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-700 hover:text-primary rounded hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
            >
              <FileEdit className="h-4 w-4" />
              <span>Go to Document Drafting</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/compliance"))}
              className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-700 hover:text-primary rounded hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
            >
              <Shield className="h-4 w-4" />
              <span>Go to Compliance Checker</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/chat"))}
              className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-700 hover:text-primary rounded hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
            >
              <Mic className="h-4 w-4" />
              <span>Go to Voice Assistant (Chat)</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate("/agents"))}
              className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-700 hover:text-primary rounded hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
            >
              <Cpu className="h-4 w-4" />
              <span>Go to AI Agents</span>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Quick Actions" className="text-[10px] font-semibold tracking-wider text-neutral-400 px-3 py-1.5 uppercase mt-3">
            <Command.Item
              onSelect={() => runCommand(() => navigate("/chat"))}
              className="flex items-center gap-3 px-3 py-2 text-xs text-primary rounded hover:bg-primary/5 cursor-pointer transition-colors duration-150 font-medium"
            >
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span>Ask Voice Assistant</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
          </motion.div>
        </Command.Dialog>
      )}
    </AnimatePresence>
  );
};
