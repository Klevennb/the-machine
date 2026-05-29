export function invariant(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function invariantString(
  value: unknown,
  name: string
): asserts value is string {
  invariant(typeof value === "string", `${name} must be a string.`);
}

export function invariantObject(
  value: unknown,
  name: string
): asserts value is Record<string, unknown> {
  invariant(
    Boolean(value) && typeof value === "object" && !Array.isArray(value),
    `${name} must be an object.`
  );
}
