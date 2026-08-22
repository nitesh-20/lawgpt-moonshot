"use client";

import { useEffect, useRef, useCallback } from "react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    ImageIcon,
    FileUp,
    Figma,
    MonitorIcon,
    CircleUserRound,
    ArrowUpIcon,
    Paperclip,
    PlusIcon,
} from "lucide-react";

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            // Temporarily shrink to get the right scrollHeight
            textarea.style.height = `${minHeight}px`;

            // Calculate new height
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        // Set initial height
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    // Adjust height on window resize
    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

export interface VercelV0ChatProps {
    value: string;
    onChange: (val: string) => void;
    onSubmit: () => void;
    isSearching?: boolean;
    language?: string;
    setLanguage?: (lang: string) => void;
    voiceComponent?: React.ReactNode;
}

export function VercelV0Chat({
    value,
    onChange,
    onSubmit,
    isSearching = false,
    language = "en",
    setLanguage,
    voiceComponent,
}: VercelV0ChatProps) {
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !isSearching) {
                onSubmit();
                adjustHeight(true);
            }
        }
    };

    const handlePromptClick = (promptText: string) => {
        onChange(promptText);
        // Delay slightly to allow state to settle
        setTimeout(() => {
            onSubmit();
        }, 100);
    };

    return (
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-6">
            <div className="w-full">
                <div className="relative bg-neutral-900 rounded-2xl border border-neutral-800 shadow-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all duration-200">
                    <div className="overflow-y-auto">
                        <Textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(e) => {
                                onChange(e.target.value);
                                adjustHeight();
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask LawGPT a legal compliance or research query..."
                            style={{
                                overflow: "hidden",
                                backgroundColor: "transparent",
                                color: "#ffffff"
                            }}
                            className={cn(
                                "w-full px-4 py-4.5",
                                "resize-none",
                                "!bg-transparent",
                                "!border-none",
                                "!text-white text-base leading-relaxed",
                                "focus:outline-none",
                                "!focus-visible:ring-0 !focus-visible:ring-offset-0",
                                "placeholder:text-neutral-500 placeholder:text-sm",
                                "min-h-[60px]"
                            )}
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 border-t border-neutral-800/60 bg-neutral-900/40">
                        <div className="flex items-center gap-2">
                            {voiceComponent && (
                                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-neutral-800 hover:bg-neutral-700 transition-colors text-white cursor-pointer shrink-0">
                                    {voiceComponent}
                                </div>
                            )}

                            {setLanguage && (
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="bg-neutral-800 border border-neutral-700 text-xs font-semibold h-10 px-3 focus:outline-none focus:border-neutral-500 cursor-pointer rounded-xl text-neutral-300 uppercase"
                                >
                                    <option value="en">English (EN)</option>
                                    <option value="hi-IN">Hindi (HI)</option>
                                    <option value="ta-IN">Tamil (TA)</option>
                                    <option value="te-IN">Telugu (TE)</option>
                                    <option value="bn-IN">Bengali (BN)</option>
                                </select>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={isSearching || !value.trim()}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5",
                                    value.trim() && !isSearching
                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                        : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                )}
                            >
                                <ArrowUpIcon className="w-4 h-4" />
                                <span>Search</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                    <ActionButton
                        icon={<CircleUserRound className="w-3.5 h-3.5" />}
                        label="Explain DPDP Act"
                        onClick={() => handlePromptClick("What are the obligations under DPDP Act?")}
                    />
                    <ActionButton
                        icon={<Figma className="w-3.5 h-3.5" />}
                        label="Review NDA Liabilities"
                        onClick={() => handlePromptClick("Review NDA liabilities and termination clauses")}
                    />
                    <ActionButton
                        icon={<MonitorIcon className="w-3.5 h-3.5" />}
                        label="Employment Termination"
                        onClick={() => handlePromptClick("Can an employer terminate employment without notice?")}
                    />
                    <ActionButton
                        icon={<FileUp className="w-3.5 h-3.5" />}
                        label="FEMA Compounding"
                        onClick={() => handlePromptClick("What are compounding options under FEMA Section 13?")}
                    />
                </div>
            </div>
        </div>
    );
}

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
}

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-full border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
            {icon}
            <span className="text-[11px] font-medium">{label}</span>
        </button>
    );
}
