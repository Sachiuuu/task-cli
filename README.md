# task-cli

A simple command-line task manager for everyday to-do tracking. Add, list, complete, update, and delete tasks right from your terminal.

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

3. Install the CLI globally (so you can use `task-cli` from anywhere):
   ```bash
   npm link
   ```

Now you can use `task-cli` from any terminal window.

## Usage

### Add a task
```bash
task-cli add "Buy groceries"
# Output: Task added: #1 "Buy groceries"
```

### List all tasks
```bash
task-cli list
```
```
  ID  | Status | Title
  ----|--------|------
    1 | todo   | Buy groceries
    2 | done   | Walk the dog

  Total: 2 task(s)
```

### Filter tasks by status
```bash
task-cli list --status todo
task-cli list --status done
```

### Mark a task as done
```bash
task-cli done 1
# Output: Task #1 marked as done: "Buy groceries"
```

### Update a task title
```bash
task-cli update 1 "Buy organic groceries"
# Output: Task #1 updated: "Buy organic groceries"
```

### Delete a task
```bash
task-cli delete 1
# Output: Task #1 deleted: "Buy groceries"
```

### Undo the last action
```bash
task-cli undo
# Output: ✔ Last action undone.
```
Undo works for: add, done, delete, and update. Single level (one step back).

### Show help
```bash
task-cli --help
task-cli add --help
```

## Shortcuts / Aliases

All commands have short aliases for faster typing. You can also use `t` instead of `task-cli`:

| Full command      | Short alias |
|---|---|
| `task-cli add`    | `tsk a`     |
| `task-cli list`   | `tsk l`     |
| `task-cli done`   | `tsk d`     |
| `task-cli delete` | `tsk del`   |
| `task-cli update` | `tsk u`     |
| `task-cli undo`   | `tsk undo`  |

Example:
```bash
tsk a "Buy milk"
tsk l
tsk d 1
tsk undo
```

All commands ask for confirmation before executing (except `list`). Use `-y` or `--yes` to skip:
```bash
tsk a "Buy milk" --yes
tsk del 1 --yes
```

## Where is my data stored?

Your tasks are saved in a JSON file at `~/.task-cli-data.json` (your home directory). This file persists across terminal sessions — you can close and reopen your terminal without losing data.

To use a custom data file location, set the `TASK_CLI_DATA_PATH` environment variable:
```bash
export TASK_CLI_DATA_PATH="/path/to/my-tasks.json"
```

## Running tests

```bash
npm test
```

This runs the full test suite (45 tests) covering task logic, data persistence, and CLI integration.

## Uninstall

```bash
npm unlink -g task-cli
```
