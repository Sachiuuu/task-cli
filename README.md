# task-cli

A simple command-line task manager for everyday to-do tracking. Add, list, complete, update, and delete tasks right from your terminal — with tag-based organization, priorities, due dates, and undo support.

## Installation

**Prerequisites:** [Node.js](https://nodejs.org/) (version 18 or higher)

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd task-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install the CLI globally (so you can use `tsk` from anywhere):
   ```bash
   npm link
   ```

Now you can use `tsk` (or `task-cli`) from any terminal window.

## Usage

### Add a task
```bash
tsk add "Buy groceries"

# With a tag
tsk add "Fix login bug" --tag work

# With a priority (high, medium, or low)
tsk add "Fix login bug" --tag work --priority high

# With a due date
tsk add "Submit report" --tag work --priority medium --due "march 15"
tsk add "Doctor visit" --due "3/20"
```

Due date formats accepted: `"march 15"`, `"mar 15"`, `"3/15"`, `"3-15"`, `"15 march"`. The year is set automatically (next year if the date has already passed).

### List all tasks
```bash
tsk list
```

Tasks are displayed in **separate tables per tag**, sorted alphabetically. Untagged tasks appear under "Other" at the bottom. Each task shows its **priority**, status, title, and due date. Tasks without a due date display `none`.

```
  💼  WORK
┌────┬──────────┬──────────┬────────────────┬─────────┐
│ ID │ Priority │ Status   │ Title          │ Due     │
├────┼──────────┼──────────┼────────────────┼─────────┤
│ 1  │ 🔴 high  │ ✓ done   │ Fix login bug  │ none    │
│ 2  │ 🟡 med   │ ○ todo   │ Submit report  │ Mar 15  │
└────┴──────────┴──────────┴────────────────┴─────────┘

  📚  SCHOOL
┌────┬──────────┬──────────┬────────────────┬─────────┐
│ ID │ Priority │ Status   │ Title          │ Due     │
├────┼──────────┼──────────┼────────────────┼─────────┤
│ 1  │ —        │ ○ todo   │ Read chapter 3 │ none    │
└────┴──────────┴──────────┴────────────────┴─────────┘

  📝 Total: 3   ✅ Completed: 1   ⏳ Pending: 2   🎯 Rate: 33%
```

Priority levels are color-coded:
- 🔴 `high` — red
- 🟡 `med` — yellow
- 🔵 `low` — cyan
- `—` — not set

### Filter and sort the list

**Filter by status:**
```bash
tsk list --status todo
tsk list --status done
```

**Sort per table:**
```bash
tsk list --sort priority       # 🔴 high → 🟡 med → 🔵 low → none (within each tag table)
tsk list --sort priority-asc   # Reverse: none → low → med → high
tsk list --sort due            # Closest due date first; tasks with no due date go last
tsk list --sort due-desc       # Furthest due date first
```

Sort options can be combined with `--status`:
```bash
tsk list --status todo --sort priority
```

### Mark a task as done
```bash
tsk done 1

# If ID 1 exists in multiple tags, specify which tag:
tsk done 1 --tag work
```

### Mark a done task back to todo
```bash
tsk todo 1
tsk todo 1 --tag school
```

### Update a task's title
```bash
tsk update 1 "Buy organic groceries"
tsk update 1 "New title" --tag work
```

### Update a task's due date
```bash
tsk update-due 1 "april 5"
tsk update-due 1 "december 31" --tag work
```

### Delete a task
```bash
tsk delete 1
tsk delete 1 --tag gym
```

After deletion, remaining tasks in that tag are renumbered from 1.

### Delete all tasks (clear)
```bash
tsk clear
```

Removes **all** tasks and resets all counters. A confirmation prompt will appear before clearing. This action **is undoable** — run `tsk undo` immediately after to restore everything.

### Undo the last action
```bash
tsk undo
```

Undo works for: `add`, `done`, `todo`, `delete`, `update`, `update-due`, and `clear`. Single level (one step back).

### Show help
```bash
tsk --help
tsk add --help
```

## Shortcuts / Aliases

All commands have short aliases for faster typing:

| Full command          | Short alias   |
|-----------------------|---------------|
| `tsk add`             | `tsk a`       |
| `tsk list`            | `tsk l`       |
| `tsk done`            | `tsk d`       |
| `tsk todo`            | `tsk td`      |
| `tsk delete`          | `tsk del`     |
| `tsk update`          | `tsk u`       |
| `tsk update-due`      | `tsk ud`      |
| `tsk clear`           | `tsk clr`     |

Example:
```bash
tsk a "Buy milk" --tag shopping --priority low
tsk l --sort priority
tsk d 1 --tag shopping
tsk undo
```

All commands ask for confirmation before executing (except `list`). Use `-y` or `--yes` to skip:
```bash
tsk a "Buy milk" --yes
tsk del 1 --yes
tsk clr --yes
```

## Tag disambiguation

Since each tag has its own ID sequence, the same ID number can exist in multiple tags. When this happens, commands that target a specific task require `--tag`:

```bash
tsk add "Fix bug"   --tag work    # ID 1 in work
tsk add "Read book" --tag school  # ID 1 in school

tsk done 1              # ✖ Error: Multiple tasks with ID 1 — use --tag
tsk done 1 --tag work   # ✔ Marks "Fix bug" as done
```

## Where is my data stored?

Your tasks are saved in a JSON file at `~/.task-cli-data.json` (your home directory). This file persists across terminal sessions.

To use a custom data file location, set the `TASK_CLI_DATA_PATH` environment variable:
```bash
export TASK_CLI_DATA_PATH="/path/to/my-tasks.json"
```

## Running tests

```bash
npm test
```

This runs the full test suite covering task logic, data persistence, and CLI integration.

## Uninstall

```bash
npm unlink -g task-cli
```
