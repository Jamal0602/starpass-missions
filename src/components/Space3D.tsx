import { motion } from "motion/react";

/** Lightweight CSS 3D planet with tilted orbit rings and a satellite. */
export function Space3D({ className = "" }: { className?: string }) {
  return (
    <div className={`relative grid place-items-center [perspective:800px] ${className}`} aria-hidden>
      <div
        className="planet-surface h-28 w-28 rounded-full shadow-neon md:h-36 md:w-36"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--primary) 70%, white) 0%, transparent 35%), repeating-linear-gradient(100deg, var(--navy) 0 14px, var(--navy-deep) 14px 30px, color-mix(in oklab, var(--primary) 35%, var(--navy)) 30px 38px)",
        }}
      />
      <div className="orbit-ring absolute h-48 w-48 rounded-full border-2 border-primary/50 md:h-60 md:w-60">
        <span className="absolute -top-1.5 left-1/2 h-3 w-3 rounded-full bg-primary shadow-neon" />
      </div>
      <div className="orbit-ring absolute h-64 w-64 rounded-full border border-dashed border-primary/25 md:h-80 md:w-80" style={{ animationDuration: "24s", animationDirection: "reverse" }} />
      <motion.span
        className="absolute h-2 w-2 rounded-full bg-foreground"
        animate={{ x: [-120, 120, -120], y: [40, -40, 40], opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
