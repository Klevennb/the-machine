import { SignUp } from "@clerk/nextjs";

export function AuthSignUp() {
  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: "w-full max-w-md",
          cardBox:
            "rounded-2xl border border-white/80 bg-white/90 shadow-[var(--shadow-soft)] backdrop-blur-xl",
        },
        variables: {
          colorPrimary: "#45645e",
          colorText: "#1b1c1c",
          borderRadius: "1rem",
          fontFamily: "var(--font-ui)",
        },
      }}
      fallbackRedirectUrl="/"
      signInUrl="/login"
    />
  );
}
