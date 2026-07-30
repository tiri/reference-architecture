import type { FC } from "react";
import { ArrowRight } from "@untitledui/icons";
import { Link as AriaLink } from "react-aria-components";
import { cx } from "../../../utils/cx";

/**
 * The tones a figure can carry, named as the badges name them so a dashboard and a table
 * speak with one vocabulary.
 */
export type MetricTone = "gray" | "brand" | "success" | "warning" | "error";

const tones: Record<MetricTone, string> = {
  gray: "bg-utility-neutral-50 text-featured-icon-light-fg-gray",
  brand: "bg-utility-brand-50 text-featured-icon-light-fg-brand",
  success: "bg-utility-green-50 text-featured-icon-light-fg-success",
  warning: "bg-utility-yellow-50 text-featured-icon-light-fg-warning",
  error: "bg-utility-red-50 text-featured-icon-light-fg-error",
};

export interface MetricCardProps {
  /** What is being counted, in the reader's words. */
  title: string;
  /** The figure. Numbers are grouped for the locale; undefined means "not answered yet". */
  value?: number | string;
  icon: FC<{ className?: string }>;
  tone?: MetricTone;
  /** Where the figure comes from. Given, the whole card is the link to it. */
  href?: string;
}

/**
 * One figure, as Untitled UI draws a metrics card: the featured icon, what is counted,
 * and the number in display type. Built here from the design system's tokens rather than
 * vendored, because the metrics cards are not part of the open-source set.
 *
 * <p>A dashboard is a set of these and nothing else, so this is where the conventions for
 * a figure live — how a number is written, and what is shown while it is still unknown.
 */
export function MetricCard({ title, value, icon: Icon, tone = "gray", href }: MetricCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <div className={cx("flex size-10 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="size-5" />
        </div>
        {href && (
          <ArrowRight className="size-5 text-quaternary transition duration-150 group-hover:text-brand-secondary" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-tertiary">{title}</p>
        {/* Never a zero while the answer is on its way: zero is an answer, and one that
            reads as reassuring. An empty bar says only that nobody knows yet. */}
        {value === undefined ? (
          <span className="my-1.5 block h-7 w-24 animate-pulse rounded bg-secondary" />
        ) : (
          <span className="text-display-sm font-semibold text-primary">
            {typeof value === "number" ? value.toLocaleString("de-DE") : value}
          </span>
        )}
      </div>
    </>
  );

  // A border, not a ring: a ring is drawn outside the box, so any ancestor that clips —
  // a scroll container, a rounded card — takes the outer edge off whichever cards sit
  // against it, and the grid ends up with edges missing on some cards and not others.
  const className = cx(
    "group flex flex-col gap-4 rounded-xl border border-secondary bg-primary p-5 shadow-xs",
    href
      && "transition duration-150 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
  );

  // Through react-aria's Link, so a card inside the app follows the app's router instead
  // of reloading it — the same route the buttons take.
  return href ? (
    <AriaLink href={href} className={className}>
      {body}
    </AriaLink>
  ) : (
    <div className={className}>{body}</div>
  );
}
