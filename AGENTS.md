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