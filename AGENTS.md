# Development Guidelines

## Test-Driven Development

This project follows Test-Driven Development (TDD) for all new work.

### Rules

- Never write production code before a failing test exists.
- Implement one behavior at a time.
- Write the smallest failing test possible.
- Write only enough production code to make the test pass.
- Refactor only after all tests pass.
- Keep tests deterministic, isolated, and fast.

## Existing Code

This project contains legacy code that may not have tests.

When modifying existing code:

- Do not attempt to add tests for the entire module.
- First add characterization tests around the behavior being changed.
- Preserve existing behavior unless the task explicitly requires changing it.
- Add regression tests for every bug before fixing it.

## Feature Development Workflow

For every new feature:

1. Break the feature into small behaviors.
2. Implement one behavior at a time.
3. Create a failing test.
4. Make the test pass with the smallest implementation.
5. Refactor.
6. Repeat.

Avoid implementing multiple behaviors in a single iteration.

## Bug Fix Workflow

Before fixing a bug:

1. Reproduce it with a failing test.
2. Verify the test fails.
3. Implement the fix.
4. Verify all tests pass.

Never fix a bug without first adding a regression test unless it's impossible to reproduce.

## Code Quality

Favor:

- Small functions
- Dependency injection where appropriate
- Pure functions when practical
- Clear interfaces
- Composition over inheritance
- Readability over cleverness

If code is difficult to test, improve the design rather than skipping tests.

## When Unsure

If a requested change would require large-scale refactoring or violate these guidelines:

- Explain the trade-offs.
- Propose a smaller incremental approach.
- Do not rewrite large portions of working code without explicit approval.

## Deep Module Design Rule

Prefer deep modules with shallow interfaces, following John Ousterhout's *A Philosophy of Software Design*.

When introducing or changing a module:

- Keep its public interface substantially simpler than the behavior it encapsulates.
- Hide domain rules, state transitions, data representation, and third-party details behind that interface.
- Prefer a few cohesive operations over many narrowly exposed methods that force callers to orchestrate internals.
- Avoid pass-through methods, shallow wrappers, and layers that merely rename another interface without hiding complexity.
- Keep errors that can be handled internally out of the public contract; expose typed outcomes when callers must decide what happens next.
- Design the interface around the common use case and make the module itself absorb edge-case complexity.
- Test behavior through the public interface so internal structure can change without cascading test rewrites.

Before adding a new abstraction, explain what complexity it hides. If the interface is not simpler than the implementation it exposes, deepen the module or remove the abstraction.