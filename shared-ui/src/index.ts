// Design system (Untitled UI, MIT — see LICENSE-untitledui)
export { Button } from "./components/base/buttons/button";
export { Avatar } from "./components/base/avatar/avatar";
export { Badge, BadgeWithDot } from "./components/base/badges/badges";
export type { BadgeColor } from "./components/base/badges/badges";
export { Checkbox } from "./components/base/checkbox/checkbox";
export { Input } from "./components/base/input/input";
export { Select } from "./components/base/select/select";
export { Dropdown } from "./components/base/dropdown/dropdown";
export { Tooltip, TooltipTrigger } from "./components/base/tooltip/tooltip";
export { Table, TableCard, TableRowActionsDropdown } from "./components/application/table/table";
export { DataTableCard, Spinner } from "./components/application/table/data-table-card";
export type { DataColumn, DataTableCardProps } from "./components/application/table/data-table-card";
export { FilterControl, FilterConditions, serializeConditions, usableConditions } from "./components/application/table/table-filter";
export { useTableQuery } from "./components/application/table/useTableQuery";
export type { QueryPage, TableQueryOptions } from "./components/application/table/useTableQuery";
export type { Condition, FilterField } from "./components/application/table/table-filter";
export { MetricCard } from "./components/application/metrics/metric-card";
export type { MetricTone } from "./components/application/metrics/metric-card";
export { cx } from "./utils/cx";

// App shell (common look and feel)
export { AppShell, useModuleInfo } from "./components/app-shell/AppShell";
export type { NavItem, ModuleInfo } from "./components/app-shell/AppShell";
export { Breadcrumbs } from "./components/app-shell/Breadcrumbs";
export { PageHeader } from "./components/app-shell/PageHeader";
export { PaginationCardMinimal } from "./components/application/pagination/pagination";
export { SearchInput } from "./components/base/search-input";
export { AppTile } from "./components/app-shell/AppTile";
export { TenantSwitcher } from "./components/app-shell/TenantSwitcher";
export { UserMenu } from "./components/app-shell/UserMenu";

// Auth (BFF contract)
export { AuthProvider, useAuth, useUser, useTenant } from "./auth/AuthProvider";
export type { AuthProviderProps, User, Tenant } from "./auth/AuthProvider";
export { login, logout } from "./auth/auth";

// API client
export { apiFetch } from "./api/apiFetch";
export { ApiError } from "./api/problem";
export type { ProblemDetail } from "./api/problem";
