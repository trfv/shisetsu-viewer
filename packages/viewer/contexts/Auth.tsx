import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type AuthContextValue = {
  isLoading: boolean;
  authenticated: boolean;
  // anonymous は実効ロールが anonymous であること、trial はトライアル期間中であることを表す。
  // 期限切れのトライアルは anonymous: true, trial: false になる。
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
  email: string | null;
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

  const logout = useCallback(() => {
    fetch("/auth/logout", { method: "POST" }).finally(() => window.location.assign("/"));
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoading, authenticated, userInfo: { anonymous, trial }, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
