import React from "react";
import type { User } from "./api";

export type SessionContextValue = {
  user: User | null;
  authReady: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

export const SessionContext = React.createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const v = React.useContext(SessionContext);
  if (!v) {
    throw new Error("useSession must be used within SessionContext.Provider");
  }
  return v;
}
