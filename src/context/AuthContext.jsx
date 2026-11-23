import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setUnauthorizedHandler, tokenStore } from "../services/api";
import { authService } from "../services";
import { useToast } from "./ToastContext";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler((code) => {
      signOut();
      toast.info(code === "TOKEN_EXPIRED" ? "Your session expired. Please sign in again." : "Please sign in to continue.");
    });
  }, [signOut, toast]);

  useEffect(() => {
    if (!tokenStore.get()) return;
    authService
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const accept = useCallback(({ token, user: nextUser }) => {
    tokenStore.set(token);
    setUser(nextUser);
    return nextUser;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      signOut,
      login: (body) => authService.login(body).then(accept),
      register: (body) => authService.register(body).then(accept),
    }),
    [user, loading, signOut, accept]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
