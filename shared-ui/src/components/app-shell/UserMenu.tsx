import { ChevronSelectorVertical, LogOut01 } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { Avatar } from "@platform/shared-ui/src/components/base/avatar/avatar";
import { Dropdown } from "@platform/shared-ui/src/components/base/dropdown/dropdown";
import { logout } from "@platform/shared-ui/src/auth/auth";
import { useAuth } from "@platform/shared-ui/src/auth/AuthProvider";
import { useModuleInfo } from "@platform/shared-ui/src/components/app-shell/AppShell";
import { cx } from "@platform/shared-ui/src/utils/cx";

/**
 * User card at the foot of the sidebar: identity at a glance; what is running, and the
 * way out, in the menu.
 */
export function UserMenu() {
  const { user, activeTenant } = useAuth();
  const info = useModuleInfo();

  return (
    <Dropdown.Root>
      <AriaButton
        aria-label="Benutzermenü öffnen"
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-1.5 outline-focus-ring transition duration-100 hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Avatar size="md" alt={user.name} initials={initials(user.name)} />
        <span className="flex min-w-0 flex-1 flex-col items-start">
          <span className="w-full truncate text-left text-sm font-semibold text-primary">
            {user.name}
          </span>
          <span className="w-full truncate text-left text-sm text-tertiary">
            {user.email ?? user.subject}
          </span>
        </span>
        <ChevronSelectorVertical className="size-4 shrink-0 text-fg-quaternary" />
      </AriaButton>
      <Dropdown.Popover className="w-72">
        {/* The deployment facts live here rather than on a page of their own. They are
            what a support call asks for first and nothing anyone navigates to: a page
            for them would be one more entry in every application's sidebar, earning its
            place about once a year. */}
        <dl className="flex flex-col gap-2 border-b border-secondary px-4 py-3">
          <Fact label="Anwendung" value={info?.name} />
          <Fact label="Version" value={info?.version} />
          <Fact label="Mandant" value={activeTenant} />
          <Fact label="Rollen" value={user.roles.join(", ") || undefined} />
        </dl>
        <Dropdown.Menu onAction={(key) => key === "logout" && logout()}>
          <Dropdown.Item id="logout" icon={LogOut01} label="Abmelden" />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-tertiary">{label}</dt>
      <dd className="truncate text-xs font-medium text-secondary">{value ?? "–"}</dd>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
