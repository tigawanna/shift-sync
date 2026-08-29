import type { ReactNode } from "react";

type DashboardPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function DashboardPageHeader({ title, description, actions }: DashboardPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-base-content/70 mt-2 max-w-2xl text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
