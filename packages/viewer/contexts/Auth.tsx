import { createContext, use, useState, type ReactNode } from "react";

type AuthState = {
  authenticated: boolean;
  // trial は UI だけが使い、api の認可には影響しない。
  userInfo: { anonymous: boolean; trial: boolean };
};

type MeResponse = {
  authenticated: boolean;
  anonymous: boolean;
  trial: boolean;
};

const ANONYMOUS: AuthState = {
  authenticated: false,
  userInfo: { anonymous: true, trial: false },
};

export const AuthContext = createContext<Promise<AuthState>>(Promise.resolve(ANONYMOUS));

export const useAuth = (): AuthState => use(use(AuthContext));

export const loadAuthState = async (): Promise<AuthState> => {
  try {
    const response = await fetch("/auth/me", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(String(response.status));
    const me = (await response.json()) as MeResponse;
    return {
      authenticated: me.authenticated,
      userInfo: { anonymous: me.anonymous, trial: me.trial },
    };
  } catch {
    return ANONYMOUS;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState] = useState(loadAuthState);
  return <AuthContext value={authState}>{children}</AuthContext>;
};

export const login = () => {
  const redirect = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
};

// 失敗しても Cookie は消えている可能性が高いので、トップへ戻して状態を取り直す。
export const logout = () => {
  fetch("/auth/logout", { method: "POST" })
    .then((response) => response.json() as Promise<{ logoutUrl?: string }>)
    .then(({ logoutUrl }) => window.location.assign(logoutUrl ?? "/"))
    .catch(() => window.location.assign("/"));
};
