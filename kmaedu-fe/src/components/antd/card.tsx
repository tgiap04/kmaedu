import * as React from "react";
import { Card as AntCard } from "antd";
import { cn } from "@/lib/utils";

/**
 * antd Card with no body padding: every caller pads the card itself (`p-4` on the Card, or the parts
 * below), the way shadcn cards work. antd's own 24px body padding used to double that.
 */
function Card({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <AntCard
      className={cn("overflow-hidden !rounded-lg !border-hairline !bg-surface-card !text-ink !shadow-none", className)}
      styles={{ body: { padding: 0 } }}
      {...(props as any)}
    >
      {children}
    </AntCard>
  );
}
function CardHeader({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("px-5 pt-5", className)} {...props} />; }
function CardTitle({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("font-display text-lg leading-tight text-ink", className)} {...props} />; }
function CardDescription({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("text-sm text-muted-foreground", className)} {...props} />; }
function CardContent({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("p-5", className)} {...props} />; }
function CardFooter({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("flex items-center px-5 pb-5", className)} {...props} />; }
function CardAction({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("self-start justify-self-end", className)} {...props} />; }
export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
