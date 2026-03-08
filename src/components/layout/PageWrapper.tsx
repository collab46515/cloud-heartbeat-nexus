import { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageWrapper({ children, title, description, actions }: PageWrapperProps) {
  return (
    <div className="page-animate-in space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
