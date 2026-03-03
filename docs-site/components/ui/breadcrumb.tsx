import * as React from "react";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" className={cn("text-xs", className)} {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol className={cn("flex items-center gap-1.5 text-muted-foreground", className)} {...props} />;
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("inline-flex items-center gap-1.5", className)} {...props} />;
}

function BreadcrumbLink({ className, ...props }: React.ComponentProps<"a">) {
  return <a className={cn("hover:text-foreground", className)} {...props} />;
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("font-medium text-foreground", className)} {...props} />;
}

function BreadcrumbSeparator({ className, children, ...props }: React.ComponentProps<"li">) {
  return (
    <li aria-hidden className={cn("text-muted-foreground/70", className)} {...props}>
      {children ?? <ChevronRightIcon className="size-3.5" />}
    </li>
  );
}

export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
