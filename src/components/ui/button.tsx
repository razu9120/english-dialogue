import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Flat, restrained, hardware-like buttons (§7.4). Colors/sizes come from
// design tokens via Tailwind utilities — never hard-coded (§7.5).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-mono text-xs uppercase tracking-wider transition-colors disabled:pointer-events-none disabled:text-disabled select-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background hover:opacity-90",
        accent: "bg-accent text-accent-foreground hover:opacity-90",
        outline:
          "border border-border bg-surface text-foreground hover:bg-surface-2",
        ghost: "text-foreground hover:bg-surface-2",
      },
      size: {
        default: "h-11 px-4 min-w-11", // 44px touch target (§7.6)
        icon: "h-11 w-11",
        sm: "h-9 px-3",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
