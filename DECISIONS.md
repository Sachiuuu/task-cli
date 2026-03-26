# Design Decisions

## 1. JSON file in home directory for data storage

**Decision:** Store all task data in a single JSON file at `~/.task-cli-data.json`.

**Alternatives considered:**
- **SQLite database:** More robust for large datasets, supports queries, handles concurrent access.
- **Project-local file:** Store data in the current working directory.
- **XDG Base Directory:** Use `~/.config/task-cli/data.json` (Linux standard).

**Why JSON in home directory:**
- Zero external dependencies — no native modules to compile (SQLite requires `better-sqlite3` or similar).
- Works identically on Windows, macOS, and Linux without platform-specific path logic.
- Easy to inspect, debug, and backup — it's just a text file.
- A single location in the home directory means tasks are accessible from any terminal and any working directory.

**Tradeoffs:**
- Not scalable to thousands of tasks (entire file is read and written on every operation).
- No concurrent-access safety — but a CLI tool is single-user, single-process, so this is acceptable.
- Not following XDG conventions on Linux, but this keeps the implementation simpler and cross-platform.

---

## 2. Auto-incrementing integer IDs instead of UUIDs

**Decision:** Use sequential integer IDs (1, 2, 3...) with a `nextId` counter stored in the data file. IDs are never reused, even after deletion.

**Alternatives considered:**
- **UUIDs:** Universally unique, no counter needed, no collision risk.
- **Timestamp-based IDs:** Unique without a counter but long and unreadable.
- **Array index:** Simplest implementation but breaks when tasks are deleted.

**Why integers with renumbering:**
- Users type IDs on the command line. `task-cli done 3` is far more ergonomic than `task-cli done a1b2c3d4-e5f6-7890-abcd-ef1234567890`.
- After deletion, remaining tasks are renumbered from 1 so the list always shows a clean, gapless sequence (1, 2, 3...).
- Easy to reference in conversation: "Did you finish task 3?"

**Tradeoffs:**
- Renumbering means an ID can refer to a different task after a deletion (e.g., "task 3" may become "task 2"). Users must re-check the list after any deletion.
- IDs are not stable references — if you note down an ID and delete a lower-numbered task, your note is wrong. Stable UUIDs would avoid this but are unusable on a command line.
- The `nextId` counter is still used to avoid any chance of collision during a session, even though IDs are renumbered on deletion.

---

## 3. Environment variable for data file path (testability)

**Decision:** The data file path defaults to `~/.task-cli-data.json` but can be overridden by setting the `TASK_CLI_DATA_PATH` environment variable.

**Alternatives considered:**
- **Dependency injection via function parameters:** Pass the file path as an argument to every function.
- **Mocking `fs` in tests:** Use test frameworks to intercept file system calls.
- **`--data-file` CLI flag:** Let users specify the path via a command-line option.

**Why environment variable:**
- Makes integration testing trivial — each test creates a temp file and points the env var at it, so tests never touch real user data.
- Keeps the CLI interface clean — users don't see a `--data-file` flag they'll never need.
- Useful for advanced users who want multiple separate task lists (e.g., work vs personal).
- Simpler than dependency injection, which would require threading a path parameter through every function call.

**Tradeoffs:**
- Somewhat "magic" — the env var is not visible in `--help` output, so users must read the README to discover it.
- Environment variables can be accidentally set, potentially causing data to be written to unexpected locations.
- A CLI flag would be more discoverable but would clutter the interface for the 99% of users who don't need it.
