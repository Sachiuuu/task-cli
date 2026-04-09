# SDLC Mapping — task-cli

This document maps the development of task-cli to the standard phases of the Software Development Life Cycle (SDLC), analyzing what was done, what artifacts were produced, and what was skipped.

---

## 1. Planning / Requirements Gathering

**Did I do it?** Partially — in Prompt 1.

**How?** The initial prompt to Claude defined the project requirements in a numbered list:
1. Must work from terminal, persist tasks, be easy for non-technical users.
2. Anyone can install following the README.
3. Data must persist across sessions.
4. Input validation with friendly error messages.
5. Must be tested.
6. Git history must show development story.
7. DECISIONS.md with top 3 design decisions.
8. PROMPTS.md tracking all prompts used.

**Artifacts:** The prompt itself (saved in PROMPTS.md) serves as the requirements document.

**What was missing:**
- **No formal requirements document.** The requirements were written as a single prompt, not a structured spec. There are no acceptance criteria, no user stories, no priority ranking.
- **No stakeholder analysis.** Who is the target user? "Non-technical" is mentioned once but never defined. What does "easy to use" mean concretely?
- **No scope definition.** The feature set grew organically through 7 prompts (tags, priorities, due dates, undo, clear) without a plan for which features to include or exclude.
- **Impact:** Without upfront scope, the project evolved reactively — features were added as afterthoughts (e.g., the `todo` command was added in Prompt 5 to reverse `done`, which should have been obvious from the start).

---

## 2. Design / Architecture

**Did I do it?** Partially — DECISIONS.md covers 3 key decisions.

**How?** Three design decisions were documented with alternatives considered and tradeoffs:
1. JSON file in home directory (vs SQLite, project-local, XDG).
2. Auto-incrementing integer IDs with renumbering (vs UUIDs, timestamps).
3. Environment variable for data path (vs DI, mocking fs, CLI flag).

**Artifacts:** `DECISIONS.md`

**What was missing:**
- **No architecture diagram or module map.** The project has 3 files (`storage.js`, `task.js`, `index.js`) but the relationship between them (storage = I/O layer, task = business logic, index = CLI/presentation) was never explicitly documented.
- **No data model specification.** The JSON structure (`tagCounters`, `tasks[]`, `undo`) evolved across prompts but was never defined upfront. Fields were added incrementally (priority in Prompt 7, dueDate in Prompt 5, tag in Prompt 5).
- **No error handling strategy.** The codebase uses a mix of `{ error: "message" }` return objects (in task.js) and `process.exit(1)` (in index.js), but this pattern was never designed — it emerged organically.
- **Impact:** The lack of a data model spec led to the `nextId → tagCounters` migration (Prompt 6), which wouldn't have been necessary if tags and per-tag IDs had been designed from the start.

---

## 3. Implementation / Coding

**Did I do it?** Yes — this is the core of the project.

**How?** Developed iteratively over 7 prompts, with Claude generating the code. Each prompt added features or fixed issues:
- Prompt 1: Full MVP (add, list, done, delete, update + tests)
- Prompt 2: ID renumbering + UI libraries (chalk, cli-table3, etc.)
- Prompt 3: Undo, stats, aliases, screen clear
- Prompt 4: Confirmations, binary rename, help improvements
- Prompt 5: todo command, due dates, tags
- Prompt 6: Per-tag ID tables, update-due, README rewrite
- Prompt 7: Priority, sort, clear-all, tag targeting fix

**Artifacts:** `index.js`, `src/task.js`, `src/storage.js`, `package.json`

**What was done well:**
- Clean separation of concerns: storage (I/O), task (logic), index (CLI/presentation).
- Consistent error handling pattern in the business logic layer (`{ error }` or `{ task }`).
- Input validation at multiple levels (task.js validates data, index.js validates CLI args).

**What could have been better:**
- **Code grew without refactoring.** `index.js` is 510 lines — it handles CLI definition, rendering, sorting, formatting, and user interaction all in one file. The sort logic, table rendering, and date formatting could be separate modules.
- **No linting or formatting tool.** No ESLint, no Prettier. Code style is consistent because one AI wrote it, but there's no enforcement.
- **Hardcoded values.** `MAX_TITLE_LENGTH = 200`, tag max length = 30, month map — all embedded in source with no configuration.

---

## 4. Testing

**Did I do it?** Yes — 117 tests across 3 test files.

**How?** Three test suites:
- `storage.test.js` (8 tests): File I/O, corruption recovery, migration, persistence.
- `task.test.js` (71 tests): Unit tests for all business logic functions.
- `cli.test.js` (38 tests): Integration tests running the actual CLI via `execFileSync`.

**Artifacts:** `tests/storage.test.js`, `tests/task.test.js`, `tests/cli.test.js`, `vitest.config.js`

**What was done well:**
- Tests cover happy paths, error paths, and edge cases.
- Integration tests run the real CLI as a subprocess — they catch issues that unit tests miss.
- Test isolation using temp files and `TASK_CLI_DATA_PATH`.

**What was missing:**
- **1 time-dependent test fails.** The `--sort due` integration test uses `"april 1"` as a "close" date, but after April 1 it becomes a "far" date (auto-advanced to next year). This test was never designed to be date-independent.
- **No test for exit codes.** The test for `list --status invalid` doesn't check the exit code, which hides the bug (exits 0 instead of 1).
- **No negative test for `saveData` failures.** What happens if the disk is full or the file is read-only? Untested, and indeed it crashes.
- **No performance tests.** How does the tool behave with 1,000 tasks? 10,000? The entire JSON file is read and written on every operation.
- **No test runner in CI.** Tests only run locally via `npm test`. There's no GitHub Actions, no pre-commit hooks.

---

## 5. Deployment / Release

**Did I do it?** Partially.

**How?** The project is "deployed" via `npm link` for local use. The `package.json` has a `bin` field that registers `tsk` and `task-cli` as global commands.

**Artifacts:** `package.json` (bin field), README installation instructions.

**What was missing:**
- **Not published to npm.** A user must clone the repo and run `npm link`. There's no `npm install -g task-cli` option.
- **No versioning strategy.** The version is `1.0.0` but there's no changelog, no git tags, no semantic versioning discipline.
- **No CI/CD pipeline.** No automated testing on push, no release workflow.
- **No binary distribution.** Tools like `pkg` or `esbuild` could bundle this into a standalone executable, removing the Node.js prerequisite entirely.
- **Impact:** Installation requires 3 manual steps and Node.js knowledge. A truly "easy for non-technical users" tool would be a single downloadable binary or an `npx` command.

---

## 6. Maintenance / Operations

**Did I do it?** Minimally.

**How?** The codebase has some maintenance-oriented features:
- Data file migration (`nextId` → `tagCounters`) for backward compatibility.
- Corruption recovery (bad JSON → fresh start with warning).
- `TASK_CLI_DATA_PATH` env var for custom data location.

**Artifacts:** Migration code in `storage.js`, corruption handling in `loadData()`.

**What was missing:**
- **No logging.** There's no way to debug issues after the fact. If a user reports "my tasks disappeared", there's no log to investigate.
- **No backup mechanism.** Data is written in-place. A crash during write can corrupt the file, and the "recovery" is to silently start fresh (losing all data).
- **No update mechanism.** If a bug is fixed, the user must `git pull && npm install` manually. No auto-update, no version check.
- **No telemetry or error reporting.** If the tool crashes in the wild, there's no way to know.
- **1 npm vulnerability.** `npm audit` reports 1 high severity issue. No process for monitoring or addressing dependency vulnerabilities.
- **Impact:** The tool works well in the happy path but has no safety net for the unhappy paths (corruption, crashes, dependency issues).

---

## 7. Documentation

**Did I do it?** Yes — relatively thorough.

**How?**
- `README.md`: Installation, usage for every command, flag reference, tag rules, data location, aliases table.
- `DECISIONS.md`: 3 design decisions with alternatives and tradeoffs.
- `PROMPTS.md`: Full history of all 7 prompts with what each one changed.
- `--help` output: Inline help with aliases and key options.

**Artifacts:** `README.md`, `DECISIONS.md`, `PROMPTS.md`, CLI help text.

**What was done well:**
- The README is comprehensive — every command has an example.
- The DECISIONS.md goes beyond "what" to explain "why" and "what else was considered".
- The PROMPTS.md provides full traceability of how the project evolved.

**What was missing:**
- **No contributing guide.** If someone else wants to add a feature or fix a bug, there's no guidance on code structure, testing conventions, or PR process.
- **README has a placeholder URL.** `<repository-url>` was never replaced with the actual GitHub URL.
- **No inline code comments.** The code is readable but has zero comments explaining non-obvious decisions (e.g., why `clearIfTTY` checks `process.stdout.isTTY`, why the confirm function auto-approves in non-TTY).
- **No API docs for the task module.** If someone wants to use `task.js` as a library, there's no documentation of the function signatures and return types.

---

## Phase Summary Table

| SDLC Phase | Done? | Key Artifact | Biggest Gap |
|------------|-------|-------------|-------------|
| 1. Planning | Partial | Prompt 1 (in PROMPTS.md) | No formal spec, no scope control |
| 2. Design | Partial | DECISIONS.md | No data model spec, no architecture diagram |
| 3. Implementation | Yes | Source code (3 files) | index.js is monolithic, no linting |
| 4. Testing | Yes (with issues) | 117 tests (1 failing) | Time-dependent test, no CI, no perf tests |
| 5. Deployment | Minimal | npm link | Not published, no binary, no CI/CD |
| 6. Maintenance | Minimal | Migration code | No backups, no logging, npm vulnerability |
| 7. Documentation | Yes | README, DECISIONS, PROMPTS | Placeholder URL, no contributing guide |

---

## Key Takeaway

The project excels at the **build** phases (implementation, testing, documentation) but is weak on the **before** (planning, design) and **after** (deployment, maintenance) phases. This is typical of a solo, AI-assisted project: the code gets written fast and works well, but the surrounding processes that keep software healthy long-term are absent. The most impactful improvement would be adding CI (automated tests on push) and atomic writes (to prevent data loss) — these address the two highest-risk gaps with relatively low effort.
