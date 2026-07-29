"use client";

import type { ReactNode } from "react";
import { MobileNavigationHeader } from "@platform/shared-ui/src/components/application/app-navigation/base-components/mobile-header";
import { NavItemBase } from "@platform/shared-ui/src/components/application/app-navigation/base-components/nav-item";
import { NavList } from "@platform/shared-ui/src/components/application/app-navigation/base-components/nav-list";
import type {
  NavItemDividerType, NavItemType,
} from "@platform/shared-ui/src/components/application/app-navigation/config";

/**
 * Untitled UI's sidebar navigation with section dividers, adapted in the same two places
 * as its simpler sibling: the mark is a prop, because each module wears its own rather
 * than the design system's, and the account card comes from the session instead of the
 * hard-coded identity that ships with it.
 *
 * <p>The global search input is left out: this platform has nothing to search globally,
 * and a box that searches nothing is worse than no box.
 */
interface SidebarNavigationSectionDividersProps {
  /** URL of the currently active item. */
  activeUrl?: string;
  /** The module's mark and name, shown at the top and in the mobile header. */
  brand?: ReactNode;
  /** List of items to display; an entry with `divider` opens a new section. */
  items: (NavItemType | NavItemDividerType)[];
  /** Kept at the foot of the column, above the account card — always reachable, never
   *  in the way of the pages the application is actually about. */
  footerItems?: NavItemType[];
  /** Rendered at the foot of the column — the signed-in user. */
  accountCard?: ReactNode;
}

export const SidebarNavigationSectionDividers = ({
  activeUrl,
  brand,
  items,
  footerItems = [],
  accountCard,
}: SidebarNavigationSectionDividersProps) => {
  const MAIN_SIDEBAR_WIDTH = 276;

  const content = (
    <aside
      style={{ "--width": `${MAIN_SIDEBAR_WIDTH}px` } as React.CSSProperties}
      className="flex h-full w-full max-w-full flex-col justify-between overflow-auto bg-primary pt-4 shadow-xs ring-secondary ring-inset lg:w-(--width) lg:rounded-xl lg:pt-5 lg:ring-1"
    >
      <div className="flex flex-col gap-5 px-4 lg:px-5">{brand}</div>

      <NavList activeUrl={activeUrl} items={items} />

      <div className="mt-auto flex flex-col gap-4 px-2 py-4 lg:px-4">
        {footerItems.length > 0 && (
          <ul className="flex flex-col">
            {footerItems.map((item) => (
              <li key={item.label} className="py-px">
                <NavItemBase
                  type="link"
                  href={item.href}
                  icon={item.icon}
                  badge={item.badge}
                  newTab={item.newTab}
                  current={item.href === activeUrl}
                >
                  {item.label}
                </NavItemBase>
              </li>
            ))}
          </ul>
        )}
        {accountCard}
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile header navigation */}
      <MobileNavigationHeader brand={brand}>{content}</MobileNavigationHeader>

      {/* Desktop sidebar navigation */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:py-1 lg:pl-1">{content}</div>

      {/* Placeholder to take up physical space because the real sidebar has `fixed` position. */}
      <div
        style={{ paddingLeft: MAIN_SIDEBAR_WIDTH + 4 }}
        className="invisible hidden lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block"
      />
    </>
  );
};
