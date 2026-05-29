import { ClerkProvider } from "@clerk/nextjs";

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
