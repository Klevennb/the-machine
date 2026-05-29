"use client";

import { PageError } from "@/app/components/page-error";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <PageError
      error={error}
      sectionName="Search"
      unstable_retry={unstable_retry}
    />
  );
}
