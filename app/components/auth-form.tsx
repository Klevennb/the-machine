"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    const name = formData.get("name");

    if (typeof email !== "string" || typeof password !== "string") {
      setError("Email and password are required.");
      setIsPending(false);
      return;
    }

    try {
      if (!isLogin) {
        const registerResponse = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password, name }),
        });

        const registerData = (await registerResponse.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!registerResponse.ok) {
          setError(registerData?.error ?? "Unable to create your account.");
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError(
          isLogin
            ? "That email and password combination did not work."
            : "Your account was created, but the first sign-in failed."
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white/78 p-7 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-9">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-[var(--sage-dark)]">
            WriteNow
          </p>
          <h1 className="mt-3 font-literary text-3xl font-bold text-[var(--charcoal)]">
            {isLogin ? "Welcome back." : "Create your account."}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {isLogin
              ? "Sign in to continue into your workspace."
              : "Register once and you will be signed in immediately."}
          </p>
        </div>
        <div className="rounded-full bg-[var(--paper-muted)] px-3 py-1 text-xs font-bold text-[var(--sage-dark)]">
          {isLogin ? "Login" : "Register"}
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {!isLogin ? (
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[var(--charcoal)]">
              Name
            </span>
            <input
              className="app-field w-full px-4 py-3"
              name="name"
              type="text"
              placeholder="Alex Morgan"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[var(--charcoal)]">
            Email
          </span>
          <input
            className="app-field w-full px-4 py-3"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[var(--charcoal)]">
            Password
          </span>
          <input
            className="app-field w-full px-4 py-3"
            name="password"
            type="password"
            placeholder="••••••••"
            minLength={8}
            required
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          className="app-button-primary w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
          disabled={isPending}
          type="submit"
        >
          {isPending
            ? isLogin
              ? "Signing in..."
              : "Creating account..."
            : isLogin
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <div className="mt-6 text-sm text-[var(--muted)]">
        {isLogin ? "Need an account?" : "Already have an account?"}{" "}
        <Link
          className="font-bold text-[var(--sage-dark)] underline decoration-[var(--sage)] underline-offset-4"
          href={isLogin ? "/register" : "/login"}
        >
          {isLogin ? "Register here" : "Sign in instead"}
        </Link>
      </div>
    </div>
  );
}
