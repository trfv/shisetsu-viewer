import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type AuthContextValue = {
  isLoading: boolean;
  authenticated: boolean;
  // Auth0 のアクセストークンのクレーム由来。anonymous は api が予約データを返さないロール、
  // trial はトライアル利用者であることを表す（UI だけが使い、api の認可には影響しない）。
  userInfo: { anonymous: boolean; trial: boolean };
  login: () => void;
  logout: () => void;
};

const initialContext: AuthContextValue = {
  isLoading: true,
  authenticated: false,
  userInfo: { anonymous: true, trial: false },
  login: () => null,
  logout: () => null,
};

export const AuthContext = createContext<AuthContextValue>(initialContext);
export const useAuth = () => useContext(AuthContext);

type MeResponse = {
  authenticated: boolean;
  anonymous: boolean;
  trial: boolean;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [anonymous, setAnonymous] = useState(true);
  const [trial, setTrial] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/auth/me", { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(String(response.status));
        const me = (await response.json()) as MeResponse;
        if (cancelled) return;
        setAuthenticated(me.authenticated);
        setAnonymous(me.anonymous);
        setTrial(me.trial);
      } catch {
        if (cancelled) return;
        setAuthenticated(false);
        setAnonymous(true);
        setTrial(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    const redirect = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
  }, []);

  // BFF が Cookie を消し、Auth0 のセッションも消すための遷移先を返す。
  // 失敗しても Cookie は消えている可能性が高いので、トップへ戻して状態を取り直す。
  const logout = useCallback(() => {
    fetch("/auth/logout", { method: "POST" })
      .then((response) => response.json() as Promise<{ logoutUrl?: string }>)
      .then(({ logoutUrl }) => window.location.assign(logoutUrl ?? "/"))
      .catch(() => window.location.assign("/"));
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoading, authenticated, userInfo: { anonymous, trial }, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
