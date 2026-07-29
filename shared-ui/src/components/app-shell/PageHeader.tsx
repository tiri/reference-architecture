import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Primary action(s), shown on the right on wide screens. */
  children?: ReactNode;
}

/**
 * The opening of every page: what this page is, and what you can do here. Where it sits
 * is the shell's business, one row above.
 *
 * <p>Untitled UI's simple page header — title and supporting text on the left, actions on
 * the right, a rule below. Built here from the design system's tokens rather than
 * vendored, because that component is not part of the open-source set.
 */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-secondary pb-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-display-xs font-semibold text-primary">{title}</h1>
          {/* Measured, not full-width: a supporting line that runs the whole screen is a
              line nobody finishes reading. */}
          {description && <p className="max-w-3xl text-md text-tertiary">{description}</p>}
        </div>
        {children && (
          <div className="flex shrink-0 flex-wrap items-center gap-3">{children}</div>
        )}
      </div>
    </div>
  );
}
