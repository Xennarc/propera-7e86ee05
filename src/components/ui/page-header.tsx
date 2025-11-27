import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  backButton?: ReactNode;
}

export function PageHeader({ title, description, action, backButton }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        {backButton}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
