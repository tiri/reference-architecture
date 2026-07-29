import type { BadgeColor } from "@platform/shared-ui";

/** A change the user has asked for and the platform does not hold yet. */
export interface Pending {
  id: number;
  kind: string;
  newValue: string | null;
  status: "DRAFT" | "OPEN";
}

export interface Change {
  id: number;
  recordId: string;
  kind: string;
  newValue: string | null;
  status: string;
  requestedAt: string;
}

/** How the tenant's requests are distributed across the states they pass through. */
export interface Counts {
  draft: number;
  open: number;
  applied: number;
  failed: number;
}

/** The states a request passes through, named and coloured once for both pages. */
export const changeLabels: Record<string, string> = {
  DRAFT: "vorgemerkt",
  OPEN: "eingereicht",
  APPLIED: "übernommen",
  FAILED: "fehlgeschlagen",
};

export const changeColors: Record<string, BadgeColor<"pill-color">> = {
  DRAFT: "warning",
  OPEN: "blue",
  APPLIED: "success",
  FAILED: "error",
};

export const kindLabels: Record<string, string> = {
  rename: "Umbenennung",
};
