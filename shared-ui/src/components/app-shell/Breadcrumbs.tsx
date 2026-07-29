import type { ReactNode } from "react";
import { ChevronRight, HomeLine } from "@untitledui/icons";
import { Link as AriaLink } from "react-aria-components";

export interface BreadcrumbsProps {
  /** Where home leads. The application's own starting page. */
  homeUrl?: string;
  /** The page itself. Rendered as the resting place of the trail, not as a link. */
  current?: string;
}

/**
 * The trail above a page title: home, the context you are in, the page you are on.
 *
 * <p>Untitled UI's breadcrumb pattern — chevron separators, the current page marked as a
 * quiet chip rather than another link.
 */
export function Breadcrumbs({ homeUrl, current }: BreadcrumbsProps) {
  return (
    <nav aria-label="Brotkrumen" className="flex min-w-0 items-center gap-1.5">
      {homeUrl && (
        <>
          <AriaLink
            href={homeUrl}
            aria-label="Übersicht"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg-quaternary outline-focus-ring transition duration-100 hover:bg-primary_hover hover:text-fg-secondary focus-visible:outline-2"
          >
            <HomeLine className="size-5" />
          </AriaLink>
          {current && <Separator />}
        </>
      )}
      {current && <Current label={current} />}
    </nav>
  );
}

function Separator() {
  return <ChevronRight className="size-4 shrink-0 text-fg-quaternary" />;
}

function Current({ label }: { label: string }) {
  return (
    <span
      aria-current="page"
      className="flex h-8 items-center truncate rounded-md bg-primary_hover px-2 text-sm font-semibold text-secondary"
    >
      {label}
    </span>
  );
}
