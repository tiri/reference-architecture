import type { FC } from "react";
import { ArrowUpRight, Grid01, Table } from "@untitledui/icons";

export interface AppTileProps {
  name: string;
  description: string;
  /** Absolute URL of the module — a plain link, each module is its own application. */
  url: string;
  icon?: string;
}

const icons: Record<string, FC<{ className?: string }>> = {
  table: Table,
  grid: Grid01,
};

/** Launcher tile used by the portal's application grid. */
export function AppTile({ name, description, url, icon }: AppTileProps) {
  const Icon = (icon && icons[icon]) || Grid01;
  return (
    <a
      href={url}
      className="group flex flex-col gap-4 rounded-2xl border border-secondary bg-primary p-6 shadow-xs transition duration-150 hover:border-brand hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <div className="flex items-start justify-between">
        <div className="flex size-12 items-center justify-center rounded-lg border border-secondary bg-primary shadow-xs">
          <Icon className="size-6 text-brand-secondary" />
        </div>
        <ArrowUpRight className="size-5 text-quaternary transition duration-150 group-hover:text-brand-secondary" />
      </div>
      <div>
        <p className="text-md font-semibold text-primary">{name}</p>
        <p className="mt-1 text-sm text-tertiary">{description}</p>
      </div>
    </a>
  );
}
