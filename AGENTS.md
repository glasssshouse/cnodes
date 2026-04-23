# AGENTS.md

## Purpose

This repository contains `cnodes`, a browser-first TypeScript library for building interactive node-based canvas visualizations.

The library is intended to be installed via Node package managers and used in browser environments.

Current product direction:
- render a canvas-based graph
- create nodes
- connect nodes
- animate packets traveling along connections
- expose a fluent, chainable API
- remain framework-agnostic

This file defines repository-wide instructions for coding agents such as Codex.

---

## Key Rules

- Never merge directly to `main`.
- Use pull requests through `develop`.
- Use conventional commits:
  - `feat:`
  - `fix:`
  - `docs:`
  - `refactor:`
  - `test:`
  - `chore:`
- Document before push:
  - update relevant docs
  - update ADRs if architecture changes
  - update CHANGELOG for user-visible changes
- Test before push:
  - `npm test`
  - `npm run build`
  - `npm run lint`
  - `npm run typecheck`

If a Makefile is introduced later, the equivalent policy is:
- `make test`
- `make build`
- `make vet`

Never skip validation for code that changes behavior, public API, or build output.

---

## Working Style

- Keep changes small, focused, and easy to review.
- Prefer minimal, incremental progress over speculative design.
- Preserve public API stability whenever possible.
- Do not add features that were not requested.
- Do not over-engineer v1.
- Prefer maintainability and clarity over cleverness.

Before changing architecture, confirm that the change supports the current project goal:
a small, maintainable, extensible canvas library.

---

## Architecture Rules

Preserve strong separation between these concerns:

- `core/` — graph state and domain models
- `render/` — canvas drawing and visual rendering
- `layout/` — layout persistence and positioning logic
- `fluent/` — fluent builder-style API surface
- `types/` — shared public and internal types

Do not mix rendering logic into core graph state unless there is a clear reason.

Do not tightly couple the core library to any framework such as React, Vue, Angular, or Svelte.

Keep the core browser-focused and framework-agnostic.

Do not mix graph state, render state, and animation state casually.

---

## Public API Rules

The root object should be something like `CanvasGraph`, not `CNode`.

Prefer fluent, extensible APIs such as:
- `.shape('circle')`
- `.line('bezier')`
- `.arrow('end')`

Convenience methods like `.circle()` may be added later, but they should wrap the generic method rather than becoming the only supported API.

Do not design APIs whose behavior changes depending on whether a result is assigned to a variable.

Support both identifiers and object references where practical.

Design option objects so they can grow over time without breaking callers.

Good direction:
```ts
const app = new CanvasGraph('app', {
  layoutPersistence: {
    enabled: true,
    storage: localStorage
  }
});
```

Avoid hardcoding persistence to localStorage. Persistence should be adapter-based or pluggable.

---

## TypeScript Rules

- Use strict TypeScript.
- Avoid `any`.
- Prefer explicit public types for exported APIs.
- Keep internal types separate from public types where practical.
- Prefer discriminated unions for stateful flows.
- Prefer exhaustive handling for unions and state machines.
- Make illegal states unrepresentable where practical.
- Prefer additive API evolution over breaking changes.

Use builder and fluent patterns only when they remain type-safe and understandable.

---

## Testing Rules

TDD is the default workflow.

- No production code before a failing test for real features.
- Write one failing test for the intended behavior first.
- Confirm the test fails for the expected reason.
- Then write the minimum production code required to pass.
- Refactor only after green.

Do not test mock behavior.

Do not add test-only methods to production classes.

Prefer testing real behavior and public interfaces over implementation details.

If mocking is necessary, mock at the correct boundary and preserve any behavior the test truly depends on.

---

## Validation Expectations

Before considering work complete, run the relevant checks for the change.

Minimum expectations:
- `npm test`
- `npm run build`
- `npm run lint`
- `npm run typecheck`

If the repository later adds a Makefile, keep these commands aligned with:
- `make test`
- `make build`
- `make vet`

If a command fails:
- do not ignore it
- fix the issue or clearly document why it is blocked

---

## Branching and Change Management

- Do not push directly to `main`.
- Prefer feature branches based on `develop`.
- Open a PR for review.
- Keep commits focused and readable.
- Use conventional commit messages.

Examples:
- `feat: add node builder skeleton`
- `fix: correct packet animation timing`
- `docs: describe layout persistence adapter`
- `refactor: separate renderer from graph state`
- `test: add failing test for node creation`
- `chore: update lint configuration`

---

## Documentation Expectations

Document before push.

When adding or changing public behavior:
- update README examples if needed
- update API documentation if present
- add or update ADRs for meaningful architecture decisions
- update CHANGELOG for user-visible changes

If examples become outdated, fix them in the same change.

---

## Project Constraints

- Do not introduce framework-specific runtime code into the core library.
- Do not introduce large dependencies without a clear reason.
- Do not add persistence behavior directly to core logic without an abstraction boundary.
- Do not rename core public concepts casually.
- Do not break README examples without updating them.
- Do not add experimental APIs to the stable public entry point without clear intent.

---

## Expected Repo Areas

Preferred structure:
- `src/core/`
- `src/fluent/`
- `src/render/`
- `src/layout/`
- `src/types/`
- `demo/`
- `test/`

Agents should preserve this separation unless a change is explicitly requested.

---

## When Finishing Work

Provide:
- a short summary of what changed
- files added or modified
- tests and validation run
- known limitations or follow-up work
- any public API tradeoffs introduced

If something could not be validated, say so clearly.

## Skill Usage Instructions

Use the installed skills intentionally based on the task.

### 1. `test-driven-development`
Use for:
- every new feature
- every bug fix
- every refactor that changes behavior
- any new public API method

How to apply:
- write one failing test first
- verify it fails for the expected reason
- write the minimum code to pass
- verify tests pass
- refactor only after green

Rules:
- no production code before a failing test
- if the test passes immediately, fix the test
- do not add extra behavior beyond what the failing test requires
- if a bug is reported, reproduce it with a failing test first

### 2. `testing-anti-patterns`
Use when:
- writing or changing tests
- adding mocks
- considering test helpers or cleanup methods
- tests become complicated or brittle

How to apply:
- test real behavior, not mock behavior
- do not assert on mock-only elements or mock existence
- do not add test-only methods to production classes
- only mock when the dependency boundary is understood
- if mocking, mock the lowest useful boundary
- if creating mock data, mirror the real data structure completely

Rules:
- before adding a mock, ask whether the test can use real behavior instead
- before adding a method to production code, ask whether it only exists for tests
- if mock setup becomes larger than the test, reconsider the test design

### 3. `typescript-best-practices`
Use for:
- every `.ts` file
- every public type
- every stateful model
- every option object
- `tsconfig.json` changes

How to apply:
- make illegal states unrepresentable
- use discriminated unions for stateful flows
- use exhaustive `switch` handling
- keep types close to the domain
- prefer explicit exported types for public APIs
- avoid `any`
- use literal unions and `as const` instead of loose strings where possible

Rules:
- option objects should be designed for future extension
- public APIs should be type-first
- prefer domain-safe types over generic strings when confusion is likely

### 4. `typescript-pro`
Use when:
- designing fluent builders
- creating advanced generics
- modeling graph/node/edge/packet types
- creating branded IDs
- adding utility types
- improving type inference
- reviewing tsconfig strictness
- preparing package types for publishing

How to apply:
- design the public API from types first
- use branded types where ids should not be mixed accidentally
- use discriminated unions for lifecycle/state transitions
- use type guards and assertion functions when narrowing unknown data
- run `tsc --noEmit` after type-heavy work
- ensure declaration files remain correct for published APIs

Rules:
- do not introduce advanced types unless they improve clarity or inference
- builder patterns must remain understandable to consumers
- prefer inference-friendly APIs over clever generic tricks

### 5. Supporting references from `typescript-pro`
Load the relevant reference only when needed:

- `advanced-types.md`
  - use when working on conditional types, mapped types, template literal types, advanced generics
- `type-guards.md`
  - use when narrowing unknown values, validating runtime data, writing assertion helpers
- `utility-types.md`
  - use when shaping option types, partial update types, readonly/deep readonly helpers
- `configuration.md`
  - use when editing `tsconfig`, declaration output, build strictness, module resolution
- `patterns.md`
  - use when designing builder patterns, state machines, type-safe APIs

---

## Task-Based Trigger Guide

### When implementing a new feature
Use:
- `test-driven-development`
- `typescript-best-practices`

Also use:
- `typescript-pro` if the feature changes public types or builder APIs

Workflow:
1. write failing test
2. verify failure
3. implement minimum code
4. typecheck
5. refactor
6. run full validation

### When fixing a bug
Use:
- `test-driven-development`
- `testing-anti-patterns`

Also use:
- `type-guards.md` if the bug is caused by unsafe runtime assumptions

Workflow:
1. write failing regression test
2. verify it fails for the bug
3. implement minimum fix
4. verify test passes
5. run related tests

### When designing or changing the fluent API
Use:
- `typescript-best-practices`
- `typescript-pro`
- `patterns.md`

Focus on:
- type inference
- additive API evolution
- avoiding confusing return types
- keeping builders readable and extensible

### When editing tests
Use:
- `test-driven-development`
- `testing-anti-patterns`

Focus on:
- real behavior
- minimal mocking
- no test-only production code
- small, single-behavior test cases

### When editing TypeScript config or package types
Use:
- `typescript-best-practices`
- `typescript-pro`
- `configuration.md`

Focus on:
- strictness
- declaration output
- module resolution
- publishable library typing

---

## Repository-Specific Defaults for `cnodes`

For this project, treat the following as defaults:

- always apply `test-driven-development` for production code changes
- always apply `testing-anti-patterns` when modifying tests
- always apply `typescript-best-practices` when editing TypeScript
- apply `typescript-pro` only when type design becomes non-trivial or public API design is involved

---

## Stop Conditions

Pause and rethink if any of these happen:
- production code exists without a failing test first
- a test mainly asserts mock behavior
- a production method exists only for tests
- advanced generic types make the API harder to understand
- public types become more clever than useful
- option objects are too rigid to extend later