import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../api/apiFetch";
import { ApiError } from "../api/problem";
import { login } from "./auth";

export interface Tenant {
  id: string;
  name: string;
}

/**
 * The user context served by the module's `GET /api/me`, sourced from the validated
 * token and the roles the IAM reports. It is deliberately tenant-independent — the
 * response is identical whichever tenant is being viewed, so it caches cleanly.
 */
export interface User {
  subject: string;
  name: string;
  email: string | null;
  roles: string[];
  tenants: Tenant[];
}

export interface AuthContextValue {
  user: User;
  /** The tenant currently being viewed — frontend state, never sent to the server to be stored. */
  activeTenant: string | null;
  setActiveTenant: (tenantId: string) => void;
  /** Builds a tenant-scoped API path, e.g. tenantPath("/items") → /api/t/a/items. */
  tenantPath: (suffix: string) => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TENANT_STORAGE_KEY = "platform.activeTenant";

export interface AuthProviderProps {
  /** Shown while /api/me is loading. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Loads the user before rendering children; a 401 hands control back to the BFF, which
 * starts the login. Switching tenants is a pure state change here — no request, no
 * server-side session, no reload.
 */
export function AuthProvider({ fallback = null, children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [activeTenant, setActive] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<User>("/api/me")
      .then((loaded) => {
        setUser(loaded);
        const remembered = window.localStorage.getItem(TENANT_STORAGE_KEY);
        const permitted = loaded.tenants.map((tenant) => tenant.id);
        setActive(remembered && permitted.includes(remembered) ? remembered : permitted[0] ?? null);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          login();
        } else {
          throw error;
        }
      });
  }, []);

  if (!user) {
    return <>{fallback}</>;
  }

  const setActiveTenant = (tenantId: string) => {
    // Only a preference: the module checks the tenant against the token on every request.
    window.localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
    setActive(tenantId);
  };

  const value: AuthContextValue = {
    user,
    activeTenant,
    setActiveTenant,
    tenantPath: (suffix: string) => `/api/t/${encodeURIComponent(activeTenant ?? "")}${suffix}`,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}

export function useUser(): User {
  return useAuth().user;
}

/** The active tenant plus a helper for tenant-scoped API paths. */
export function useTenant() {
  const { activeTenant, setActiveTenant, tenantPath } = useAuth();
  return { activeTenant, setActiveTenant, tenantPath };
}
