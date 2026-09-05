import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// RADIUS is sharp in IDENTITY.md, so badges are square-cornered stamps, not pills.
const badgeVariants = cva(
  "inline-flex items-center rounded-xs border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        // A precedent stamped on a record: the only place the seal color appears.
        seal: "border-transparent bg-seal text-ground",
        closed: "border-second text-second",
        pending: "border-warn text-warn",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
