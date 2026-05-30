"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitWritingPrompt } from "@/app/submit-prompt/actions";

type PromptState = {
  error?: string;
  success?: string;
};

const initialState: PromptState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="app-button-primary inline-flex items-center justify-center px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Sending..." : "Submit Prompt"}
    </button>
  );
}

function Message({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) {
    return null;
  }

  return (
    <p
      className={`rounded-xl px-4 py-3 text-sm font-semibold ${
        error
          ? "bg-[var(--sunset-soft)] text-[var(--sunset)]"
          : "bg-[var(--sage-soft)] text-[var(--sage-dark)]"
      }`}
    >
      {error ?? success}
    </p>
  );
}

function FieldShell({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[var(--charcoal)]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export function PromptForm() {
  const [state, action] = useActionState(submitWritingPrompt, initialState);

  return (
    <form action={action} className="app-card space-y-5 p-5 md:p-7">
      <Message error={state.error} success={state.success} />
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_14rem]">
        <FieldShell label="Title">
          <input
            className="app-field w-full px-4 py-3 text-sm"
            maxLength={120}
            name="title"
            required
          />
        </FieldShell>
        <FieldShell label="Genre">
          <input
            className="app-field w-full px-4 py-3 text-sm"
            maxLength={48}
            name="genre"
            placeholder="Free text"
            required
          />
        </FieldShell>
      </div>
      <FieldShell label="Prompt">
        <textarea
          className="app-field min-h-56 w-full resize-y px-4 py-3 text-sm leading-6"
          maxLength={5000}
          name="body"
          required
        />
      </FieldShell>
      <p className="text-sm leading-6 text-[var(--muted)]">
        Prompts appear publicly after admin review.
      </p>
      <SubmitButton />
    </form>
  );
}
