import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from "react";
import { LayoutAlt01 } from "@untitledui/icons";
import { SidebarNavigationSectionDividers } from "@platform/shared-ui/src/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers";
import type { NavItemType } from "@platform/shared-ui/src/components/application/app-navigation/config";
import { Breadcrumbs } from "@platform/shared-ui/src/components/app-shell/Breadcrumbs";
import { TenantSwitcher } from "@platform/shared-ui/src/components/app-shell/TenantSwitcher";
import { UserMenu } from "@platform/shared-ui/src/components/app-shell/UserMenu";
import { apiFetch } from "@platform/shared-ui/src/api/apiFetch";

export interface NavItem {
  /** The route this entry leads to — nav entries are links, so this is a path. */
  id: string;
  label: string;
  icon: FC<{ className?: string }>;
}

export interface AppShellProps {
  appName: string;
  /** The application's own icon — what makes it recognisable in the sidebar. */
  icon: FC<{ className?: string }>;
  /** The application's own pages. Every application has a sidebar, the portal included. */
  nav: NavItem[];
  /** Path of the page being shown, so the sidebar can mark it. */
  activeNavId: string;
  children: ReactNode;
}

/** What `GET /api/info` answers: deployment facts about the module itself. */
export interface ModuleInfo {
  name: string;
  version: string;
  portalUrl: string | null;
}

const ModuleInfoContext = createContext<ModuleInfo | null>(null);

/** The module's own deployment facts, for anything that needs to point back at the portal. */
export function useModuleInfo(): ModuleInfo | null {
  return useContext(ModuleInfoContext);
}

/**
 * Common platform layout: Untitled UI's sidebar navigation, and the page itself opening
 * with its own header — where you are, what the page is, what you can do.
 *
 * <p>One shape for every application, the portal included. It is a launcher rather than a
 * business module, but that is a difference in what it contains, not in how it is read;
 * giving it its own layout only taught users two.
 *
 * <p>There is deliberately no bar across the top. Everything such a bar would carry now
 * sits where it belongs: the user at the foot of the sidebar, the trail and the actions in
 * the page header, which is the one place a reader looks first.
 *
 * <p>Navigation entries are links, not buttons: a page of this module has an address, and
 * middle-click and "open in new tab" should work like they do anywhere else. The router
 * intercepts the click, so no reload happens.
 */
export function AppShell({ appName, icon, nav, activeNavId, children }: AppShellProps) {
  const [info, setInfo] = useState<ModuleInfo | null>(null);

  useEffect(() => {
    apiFetch<ModuleInfo>("/api/info").then(setInfo).catch(() => setInfo(null));
  }, []);

  const brand = (
    <div className="flex items-center gap-3">
      <ModuleMark appName={appName} icon={icon} />
      <span className="text-lg font-semibold text-primary">{appName}</span>
    </div>
  );

  // The application's own starting page, and where the trail's home leads.
  const home = nav[0]?.id;

  const items: NavItemType[] = nav.map((entry) => ({
    label: entry.label,
    href: entry.id,
    icon: entry.icon,
  }));
  // The way back to the portal is not one of the application's own pages, and not each
  // module's job to declare. It sits at the foot of the column, above the user, where
  // what is always available belongs — never in the way of the pages that matter.
  //
  // Same tab: the modules are separate origins but one product, and a new tab per switch
  // would leave the user collecting windows of the same application.
  //
  // The portal names no portal of its own, so it simply gets no entry at all.
  const footerItems: NavItemType[] = info?.portalUrl
    ? [{ label: "Alle Anwendungen", href: info.portalUrl, icon: LayoutAlt01, newTab: false }]
    : [];

  return (
    <ModuleInfoContext.Provider value={info}>
      {/* The sidebar keeps the viewport; the content scrolls. A page is as long as it has
          content to show, and squeezing it into what is left over only moved the scrollbar
          somewhere less expected — a table with its own inner scroll is a table whose
          header row and pagination the reader can no longer reach in the usual way. */}
      <div className="flex h-dvh overflow-hidden flex-col bg-primary lg:flex-row">
        <SidebarNavigationSectionDividers
          brand={brand}
          activeUrl={activeNavId}
          items={items}
          footerItems={footerItems}
          accountCard={<UserMenu />}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          {/* One row: where you are on the left, what you are looking at it through on the
              right. The trail is built here rather than by each page, because the shell
              already knows the pages and which of them is showing.
              Pinned, so that scrolling a long page never costs the reader the two things
              that say what they are looking at and for whom. */}
          <div className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between gap-4 bg-primary px-4 md:px-8">
            <Breadcrumbs
              homeUrl={home === activeNavId ? undefined : home}
              current={nav.find((entry) => entry.id === activeNavId)?.label}
            />
            <TenantSwitcher />
          </div>

          <main className="mx-auto w-full max-w-container px-4 pb-8 md:px-8">
            {children}
          </main>

        </div>
      </div>
    </ModuleInfoContext.Provider>
  );
}

/** The module's badge: its own icon, falling back to the initial if none was given. */
function ModuleMark({ appName, icon: Icon }: { appName: string; icon?: FC<{ className?: string }> }) {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-solid text-sm font-semibold text-white">
      {Icon ? <Icon className="size-5 text-white" /> : appName[0]?.toUpperCase()}
    </div>
  );
}
