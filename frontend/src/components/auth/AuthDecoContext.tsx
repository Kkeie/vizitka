import { createContext, useContext } from "react";

export type DecoMode = "floating" | "floating-nopill" | "phone";

export interface AuthDecoValue {
  mode: DecoMode;
  username: string;
  setMode: (m: DecoMode) => void;
  setUsername: (u: string) => void;
}

export const AuthDecoContext = createContext<AuthDecoValue>({
  mode: "floating-nopill",
  username: "",
  setMode: () => {},
  setUsername: () => {},
});

export function useAuthDeco() {
  return useContext(AuthDecoContext);
}
