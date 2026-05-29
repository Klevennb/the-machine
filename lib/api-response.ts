import { invariant, invariantObject, invariantString } from "@/lib/invariant";

type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

type ErrorOptions = {
  code: string;
  message: string;
  requestId: string;
  status: number;
  details?: unknown;
};

type SuccessOptions<TData extends Record<string, unknown>> = {
  data: TData;
  requestId: string;
  status?: number;
};

export type ApiSuccess<TData extends Record<string, unknown>> = {
  ok: true;
  data: TData;
  requestId: string;
} & TData;

export type ApiFailure = {
  ok: false;
  error: ApiError;
  requestId: string;
};

export function createRequestId() {
  return crypto.randomUUID();
}

export function apiSuccess<TData extends Record<string, unknown>>({
  data,
  requestId,
  status = 200,
}: SuccessOptions<TData>) {
  invariantObject(data, "data");
  invariantString(requestId, "requestId");
  invariant(Number.isInteger(status) && status >= 200 && status < 300, "status must be a 2xx integer.");

  const body: ApiSuccess<TData> = {
    ok: true,
    data,
    requestId,
    ...data,
  };

  return Response.json(body, { status });
}

export function apiError({
  code,
  message,
  requestId,
  status,
  details,
}: ErrorOptions) {
  invariantString(code, "code");
  invariantString(message, "message");
  invariantString(requestId, "requestId");
  invariant(Number.isInteger(status) && status >= 400 && status < 600, "status must be a 4xx or 5xx integer.");

  const body: ApiFailure = {
    ok: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
    requestId,
  };

  return Response.json(body, { status });
}

export function logApiError({
  error,
  metadata,
  requestId,
  route,
}: {
  error: unknown;
  metadata?: Record<string, unknown>;
  requestId: string;
  route: string;
}) {
  invariantString(requestId, "requestId");
  invariantString(route, "route");
  invariant(metadata === undefined || (typeof metadata === "object" && !Array.isArray(metadata)), "metadata must be an object when provided.");

  console.error({
    error:
      error instanceof Error
        ? {
            message: error.message,
            name: error.name,
            stack: error.stack,
          }
        : error,
    metadata,
    requestId,
    route,
  });
}
