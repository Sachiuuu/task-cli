# Quality Audit — task-cli

Audit performed on: 2026-04-09  
Version: 1.0.0  
Node.js used: v25.3.0  
Platform: Windows 11

---

## 1. Installation & Setup

### README says:
> Prerequisites: Node.js (version 18 or higher)  
> 1. Clone → 2. `npm install` → 3. `npm link`

### Findings:

| Step | Works? | Notes |
|------|--------|-------|
| `git clone` | Yes | The README still says `<repository-url>` instead of the actual GitHub URL. A user copying that literally would fail. |
| `npm install` | Yes | Installs correctly, but reports **1 high severity vulnerability** (`npm audit`). Not mentioned in the README. |
| `npm link` | Yes | Registers both `tsk` and `task-cli` as global commands. |
| `npm test` | **Partial** | 116/117 tests pass. **1 test fails** (see Section 3). |
| Node v25 compat | Yes | Runs fine, though the README says "version 18 or higher" — never tested the lower bound. |

**Issue: `node_modules` is committed to the repo.** The `.gitignore` contains `node_modules/` but the git history shows `node_modules` was included in the initial commit (`8cfe9a9`). Cloning the repo brings a stale `node_modules` that may not match the current `package-lock.json`. Running `npm install` after cloning fixes it, but a user who skips that step (thinking the modules are already there) gets `Cannot find module 'chalk'` errors because the committed modules are outdated/incomplete.

---

## 2. README Accuracy — Command by Command

| Command | README claim | Actual behavior | Verdict |
|---------|-------------|-----------------|---------|
| `tsk add "title"` | Adds a task | Works correctly | OK |
| `tsk add --tag work` | Assigns tag | Works, lowercased | OK |
| `tsk add --priority high` | Sets priority | Works (high/medium/low) | OK |
| `tsk add --due "march 15"` | Sets due date | Works for future dates | OK |
| `tsk add --due "3/20"` | Slash format | Works | OK |
| `tsk list` | Lists all tasks grouped by tag | Works | OK |
| `tsk list --status todo` | Filters by status | Works | OK |
| `tsk list --sort priority` | Sorts high→low | Works | OK |
| `tsk list --sort due` | Closest due first | Works | OK |
| `tsk done 1` | Marks as done | Works | OK |
| `tsk todo 1` | Marks back to todo | Works | OK |
| `tsk update 1 "new"` | Updates title | Works | OK |
| `tsk update-due 1 "date"` | Updates due date | Works | OK |
| `tsk delete 1` | Deletes task | Works | OK |
| `tsk clear` | Deletes all tasks | Works | OK |
| `tsk undo` | Undoes last action | Works (single level) | OK |
| `tsk --help` | Shows help | Works, includes aliases and options | OK |
| `-y` / `--yes` flag | Skips confirmation | Works on all commands that prompt | OK |
| Aliases (`a`, `l`, `d`, etc.) | Shortcut commands | All work correctly | OK |

### Minor README inaccuracies:

1. **Due date formats listed:** The README says `"15 march"` is accepted. It is, but `"2026-03-15"` (ISO format) is **not** accepted — and that's the most standard date format. Not necessarily a bug, but a user might try it.
2. **README says `tsk clear` "is undoable"** — the wording is ambiguous. It should say "**is** undoable" more clearly, perhaps "can be undone". Currently it reads like it could mean "is **not** undoable" at first glance.
3. **`TASK_CLI_DATA_PATH` env var** — documented in the README but not discoverable via `--help`. This is noted in DECISIONS.md as a known tradeoff.
4. **Uninstall section** says `npm unlink -g task-cli` but doesn't mention cleaning up `~/.task-cli-data.json`. Data persists after uninstall.

---

## 3. Test Suite

**Result: 116 passed, 1 failed (117 total)**

### Failing test:

```
FAIL  tests/cli.test.js > CLI integration > sorts tasks by closest due date with --sort due
```

**Root cause:** The test adds a task with `--due "april 1"`. Since today is April 9, 2026, `parseDueDate` auto-advances past dates to the next year (2027). So "april 1" becomes `2027-04-01`, which is **further away** than "december 31" (`2026-12-31`). The sort is correct — the test's assumption is wrong because it uses a date that is only reliably "close" when run before April 1.

**Severity:** Medium. This is a **time-dependent test** — it passed when written but fails after April 1, 2026. This kind of flaky test erodes confidence in the suite.

### Test coverage gaps:

| Area | Covered? | Notes |
|------|----------|-------|
| Add/delete/update/done/todo | Yes | Well covered with happy and error paths |
| Undo (all operations) | Yes | 6 unit + 3 integration tests |
| Due date parsing (all formats) | Yes | 10 tests |
| Tag scoping and targeting | Yes | Multiple tests for tagged vs untagged |
| Priority validation | Yes | Valid and invalid values tested |
| Storage corruption recovery | Yes | Corrupted JSON, invalid structure |
| Data migration (nextId → tagCounters) | Yes | 1 test |
| `clear` command | Yes | Including undo after clear |
| **Exit codes on error** | **Partial** | `list --status invalid` exits with code **0** instead of 1 (see Section 4) |
| **Concurrent file access** | **No** | No test for two processes writing simultaneously |
| **Very large data files** | **No** | No performance/stress tests |
| **`--help` sub-command output** | **No** | e.g., `tsk add --help` not tested |

---

## 4. Edge Cases & Error Handling

### 4.1 Exit codes inconsistency

| Scenario | Expected exit code | Actual | Correct? |
|----------|--------------------|--------|----------|
| `add ""` | 1 | 1 | Yes |
| `done abc` | 1 | 1 | Yes |
| `add --priority urgent` | 1 | 1 | Yes |
| `add --due "feb 30"` | 1 | 1 | Yes |
| `list --status invalid` | 1 | **0** | **No** |
| `list --sort random` | 1 | 1 | Yes |

**Issue:** `list --status invalid` prints an error message to stderr but exits with code 0. This is because `renderList()` uses `console.error()` and returns (no `process.exit(1)`), while the `list` action doesn't check for errors from `listTasks()`. The sort validation in the list command *does* call `process.exit(1)`, so the inconsistency is within the same command.

### 4.2 Confirmation prompt behavior

- When `stdin` is not a TTY (e.g., piped input), all confirmation prompts auto-approve (`confirm()` returns `true`). This means `echo "" | tsk delete 1` would delete without asking. This is documented behavior (non-TTY = auto-confirm), and the `-y` flag exists for scripts, but a user piping something accidentally could be surprised.

### 4.3 Data file edge cases

| Scenario | Behavior | Verdict |
|----------|----------|---------|
| Data file doesn't exist | Creates default empty data | OK |
| Data file is corrupted JSON | Warns and starts fresh | OK — but **user data is lost silently** (only a console.warn) |
| Data file has wrong structure | Warns and starts fresh | Same concern |
| Parent directory doesn't exist | Creates it recursively | OK |
| Data file is read-only | **Crashes with unhandled error** | Bug — `saveData()` has no try/catch |
| Disk full | **Crashes with unhandled error** | Same — no write error handling |

### 4.4 `parseDueDate` edge cases

| Input | Expected | Actual | Verdict |
|-------|----------|--------|---------|
| `"march 15"` | Parses OK | OK | OK |
| `"3/15"` | Parses OK | OK | OK |
| `"15 march"` | Parses OK | OK | OK |
| `"feb 29"` (non-leap year) | Error | Error | OK |
| `"feb 30"` | Error | Error | OK |
| `"13/1"` | Invalid month error | Error | OK |
| `"0/15"` | Invalid month error | Error msg says "Invalid month" | OK |
| `"3/0"` | Invalid day error | Error | OK |
| `"2026-03-15"` (ISO) | Should work? | **Error: Cannot parse** | Not a bug per se, but surprising |
| `"next friday"` | Error | Error (clear message) | OK |
| `""` (empty) | Error | Error | OK |
| `"march"` (no day) | Error | Error | OK |

### 4.5 `saveData` crash scenario

If the process is killed (Ctrl+C) during `fs.writeFileSync()`, the data file could be left in a partially-written state. The next `loadData()` would detect corrupt JSON and **silently reset to empty**, losing all user data. There is no backup/atomic-write mechanism.

---

## 5. Behavioral Quirks

### 5.1 `console.clear()` on every command
Every mutating command calls `clearIfTTY()` after confirmation, which clears the entire terminal. This means:
- The user's previous terminal output (other commands, notes) is wiped.
- If the user scrolls up, they can't see what they did before.
- This is aggressive for a CLI tool — most CLIs (git, npm, docker) never clear the screen.

### 5.2 ID renumbering after deletion
After deleting a task, all remaining tasks in that tag group are renumbered from 1. This is documented and intentional, but it means:
- If a user notes down "task #3" and then deletes task #1, their note now points to a different task.
- There's no way to get a stable reference to a task.

### 5.3 Single-level undo
Undo only goes back one step. If a user accidentally deletes two tasks, they can only recover the second one. This is documented but could surprise users.

### 5.4 Stats bar counts all tasks, not just filtered ones
When running `tsk list --status todo`, the stats bar still shows **all** tasks (total, completed, pending), not just the filtered subset. This could be confusing — the table shows 3 tasks but the stats say "Total: 10".

---

## 6. Security & Robustness

| Concern | Status |
|---------|--------|
| Command injection | **Not applicable** — no shell exec from user input |
| Path traversal via `TASK_CLI_DATA_PATH` | Low risk — the env var is set by the user themselves |
| JSON injection | **Not applicable** — `JSON.stringify` handles special chars safely |
| npm audit vulnerabilities | **1 high severity** — should be investigated and resolved |
| `.gitignore` covers sensitive files | Yes — `node_modules/` and data file excluded |

---

## 7. Summary of Issues

### Must Fix (Bugs)
1. **Failing test** — `sorts tasks by closest due date with --sort due` fails after April 1 due to time-dependent test data.
2. **Exit code 0 on `list --status invalid`** — should exit with 1 like other validation errors.
3. **`node_modules` in git history** — stale modules cause confusing errors on fresh clone.

### Should Fix (Robustness)
4. **No error handling in `saveData()`** — a read-only file or full disk crashes the process with an unhandled exception.
5. **Data loss on corrupt write** — no atomic write or backup mechanism; a crash during save loses everything.
6. **npm audit: 1 high severity vulnerability** — should be addressed before shipping.

### Nice to Fix (UX/Polish)
7. **README: `<repository-url>` placeholder** — should have the actual URL.
8. **README: "is undoable" wording** — ambiguous phrasing for the `clear` command.
9. **Stats bar ignores `--status` filter** — shows all-tasks stats even when listing a subset.
10. **`console.clear()` is aggressive** — non-standard behavior that wipes the user's terminal history.
11. **No way to remove a due date** — `update-due` requires a date; there's no `--no-due` option.
12. **No way to change a task's tag or priority** after creation — only title and due date can be updated.
