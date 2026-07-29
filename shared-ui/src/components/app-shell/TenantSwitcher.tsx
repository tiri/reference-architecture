import { Building05, ChevronSelectorVertical } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { Dropdown } from "@platform/shared-ui/src/components/base/dropdown/dropdown";
import { useAuth } from "@platform/shared-ui/src/auth/AuthProvider";

/**
 * The tenant, as the first segment of the breadcrumb: everything on the page is read in
 * this context, so it reads as "tenant › page".
 *
 * Switching is a pure frontend state change — no request, no server-side session, no
 * reload. Views re-fetch under the new tenant path, and the module checks that tenant
 * against the token on every one of those requests.
 */
export function TenantSwitcher() {
  const { user, activeTenant, setActiveTenant } = useAuth();

  if (user.tenants.length === 0) {
    return null;
  }

  const current = user.tenants.find((tenant) => tenant.id === activeTenant);

  return (
    <Dropdown.Root>
      <AriaButton
        aria-label="Mandant wechseln"
        className="flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 outline-focus-ring transition duration-100 hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Building05 className="size-5 shrink-0 text-fg-quaternary" />
        <span className="truncate text-sm font-semibold text-primary">
          {current?.name ?? "Kein Mandant"}
        </span>
        <ChevronSelectorVertical className="size-4 shrink-0 text-fg-quaternary" />
      </AriaButton>
      <Dropdown.Popover>
        <Dropdown.Menu
          selectionMode="single"
          selectedKeys={activeTenant ? [activeTenant] : []}
          onAction={(key) => setActiveTenant(String(key))}
          items={user.tenants}
        >
          {(tenant: { id: string; name: string }) => (
            <Dropdown.Item key={tenant.id} id={tenant.id} label={tenant.name} />
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}
