// Design system (Untitled UI, MIT — see LICENSE-untitledui)
export { Button } from "@platform/shared-ui/src/components/base/buttons/button";
export { Avatar } from "@platform/shared-ui/src/components/base/avatar/avatar";
export { Badge, BadgeWithDot } from "@platform/shared-ui/src/components/base/badges/badges";
export type { BadgeColor } from "@platform/shared-ui/src/components/base/badges/badges";
export { Checkbox } from "@platform/shared-ui/src/components/base/checkbox/checkbox";
export { Input } from "@platform/shared-ui/src/components/base/input/input";
export { Select } from "@platform/shared-ui/src/components/base/select/select";
export { Dropdown } from "@platform/shared-ui/src/components/base/dropdown/dropdown";
export { Tooltip, TooltipTrigger } from "@platform/shared-ui/src/components/base/tooltip/tooltip";
export { Table, TableCard, TableRowActionsDropdown } from "@platform/shared-ui/src/components/application/table/table";
export { DataTableCard, Spinner } from "@platform/shared-ui/src/components/application/table/data-table-card";
export type { DataColumn, DataTableCardProps } from "@platform/shared-ui/src/components/application/table/data-table-card";
export { FilterControl, FilterConditions, serializeConditions, usableConditions } from "@platform/shared-ui/src/components/application/table/table-filter";
export { useTableQuery } from "@platform/shared-ui/src/components/application/table/useTableQuery";
export type { QueryPage, TableQueryOptions } from "@platform/shared-ui/src/components/application/table/useTableQuery";
export type { Condition, FilterField } from "@platform/shared-ui/src/components/application/table/table-filter";
export { MetricCard } from "@platform/shared-ui/src/components/application/metrics/metric-card";
export type { MetricTone } from "@platform/shared-ui/src/components/application/metrics/metric-card";
export { cx } from "@platform/shared-ui/src/utils/cx";

// App shell (common look and feel)
export { AppShell, useModuleInfo } from "@platform/shared-ui/src/components/app-shell/AppShell";
export type { NavItem, ModuleInfo } from "@platform/shared-ui/src/components/app-shell/AppShell";
export { Breadcrumbs } from "@platform/shared-ui/src/components/app-shell/Breadcrumbs";
export { PageHeader } from "@platform/shared-ui/src/components/app-shell/PageHeader";
export { PaginationCardMinimal } from "@platform/shared-ui/src/components/application/pagination/pagination";
export { SearchInput } from "@platform/shared-ui/src/components/base/search-input";
export { AppTile } from "@platform/shared-ui/src/components/app-shell/AppTile";
export { TenantSwitcher } from "@platform/shared-ui/src/components/app-shell/TenantSwitcher";
export { UserMenu } from "@platform/shared-ui/src/components/app-shell/UserMenu";

// Auth (BFF contract)
export { AuthProvider, useAuth, useUser, useTenant } from "@platform/shared-ui/src/auth/AuthProvider";
export type { AuthProviderProps, User, Tenant } from "@platform/shared-ui/src/auth/AuthProvider";
export { login, logout } from "@platform/shared-ui/src/auth/auth";

// API client
export { apiFetch } from "@platform/shared-ui/src/api/apiFetch";
export { ApiError } from "@platform/shared-ui/src/api/problem";
export type { ProblemDetail } from "@platform/shared-ui/src/api/problem";
