import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils"; // Your shadcn/ui utility for merging classes

// Define variants for the card's overall style using cva
const cardVariants = cva(
  "relative flex flex-col justify-between h-full w-full overflow-hidden rounded-2xl p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg cursor-pointer border border-neutral-100/60",
  {
    variants: {
      gradient: {
        orange: "bg-gradient-to-br from-orange-50 to-amber-100/30 border-orange-100/40",
        gray: "bg-gradient-to-br from-slate-50 to-slate-100/30 border-slate-100/40",
        purple: "bg-gradient-to-br from-purple-50 to-indigo-100/30 border-purple-100/40",
        green: "bg-gradient-to-br from-emerald-50 to-teal-100/30 border-emerald-100/40",
      },
    },
    defaultVariants: {
      gradient: "gray",
    },
  }
);

// Define the props interface for type safety and reusability
export interface GradientCardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  badgeText: string;
  badgeColor: string; // Expecting a hex color string, e.g., "#FF5733"
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
}

const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  ({ className, gradient, badgeText, badgeColor, title, description, ctaText, ctaHref, imageUrl, ...props }, ref) => {
    
    // Animation variants for framer-motion
    const cardAnimation = {
      rest: { scale: 1, y: 0 },
      hover: { scale: 1.025, y: -4 },
    };

    const imageAnimation = {
      rest: { scale: 1, rotate: 0 },
      hover: { scale: 1.08, rotate: 2 },
    };

    return (
      <motion.div
        variants={cardAnimation}
        initial="rest"
        whileHover="hover"
        animate="rest"
        className="h-full"
        ref={ref}
      >
        <div
          className={cn(cardVariants({ gradient }), className)}
          {...props}
        >
          {/* Decorative background image with animation */}
          <motion.img
            src={imageUrl}
            alt={`${title} background graphic`}
            variants={imageAnimation}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="absolute -right-1/4 -bottom-1/4 w-2/3 opacity-40 pointer-events-none dark:opacity-10"
          />

          {/* Card Content */}
          <div className="z-10 flex flex-col h-full justify-between">
            <div>
              {/* Badge */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-2xs font-semibold text-slate-700 backdrop-blur-xs border border-slate-100 w-fit uppercase font-mono tracking-wider">
                <span 
                  className="h-2 w-2 rounded-full" 
                  style={{ backgroundColor: badgeColor }}
                />
                {badgeText}
              </div>

              {/* Title and Description */}
              <div className="space-y-2">
                <h3 className="text-lg md:text-xl font-bold text-slate-900 font-sans tracking-tight leading-snug">{title}</h3>
                <p className="text-[13px] leading-relaxed text-slate-600 font-serif max-w-xs">{description}</p>
              </div>
            </div>
            
            {/* Call to Action Link */}
            <div className="mt-8 inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-700">
              {ctaText}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);
GradientCard.displayName = "GradientCard";

export { GradientCard };
