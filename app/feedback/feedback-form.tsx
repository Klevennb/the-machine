"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitFeedback } from "@/app/feedback/actions";

type FeedbackState = {
  error?: string;
  success?: string;
};

const initialState: FeedbackState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="app-button-primary inline-flex items-center justify-center px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Sending..." : "Send Feedback"}
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

export function FeedbackForm() {
  const [state, action] = useActionState(submitFeedback, initialState);

  return (
    <form action={action} className="app-card space-y-5 p-5 md:p-7" encType="multipart/form-data">
      <Message error={state.error} success={state.success} />
      <FieldShell label="Category">
        <select
          className="app-field w-full px-4 py-3 text-sm"
          name="category"
          required
        >
          <option value="GENERAL">General</option>
          <option value="BUG">Bug</option>
          <option value="FEATURE_REQUEST">Feature request</option>
          <option value="CONTENT_REQUEST">Content request</option>
        </select>
      </FieldShell>
      <FieldShell label="Subject">
        <input
          className="app-field w-full px-4 py-3 text-sm"
          maxLength={120}
          name="subject"
          placeholder="Optional short summary"
        />
      </FieldShell>
      <FieldShell label="Screenshot or image">
        <input
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="app-field w-full px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[var(--sage)] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
          name="image"
          type="file"
        />
      </FieldShell>
      <FieldShell label="Feedback">
        <textarea
          className="app-field min-h-48 w-full resize-y px-4 py-3 text-sm leading-6"
          maxLength={4000}
          name="body"
          required
        />
      </FieldShell>
      <SubmitButton />
    </form>
  );
}
