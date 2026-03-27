const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const CLI_PATH = path.join(__dirname, "..", "index.js");
const tmpDir = os.tmpdir();
let testFilePath;

function runCli(args, expectError = false) {
  try {
    const result = execFileSync("node", [CLI_PATH, ...args], {
      env: { ...process.env, TASK_CLI_DATA_PATH: testFilePath },
      encoding: "utf-8",
      timeout: 5000,
    });
    return { stdout: result, exitCode: 0 };
  } catch (err) {
    if (expectError) {
      return { stdout: err.stdout || "", stderr: err.stderr || "", exitCode: err.status };
    }
    throw err;
  }
}

beforeEach(() => {
  testFilePath = path.join(tmpDir, `task-cli-integration-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
});

afterEach(() => {
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
});

describe("CLI integration", () => {
  it("adds a task and shows confirmation", () => {
    const { stdout } = runCli(["add", "Buy groceries"]);
    expect(stdout).toContain('Task added: #1 "Buy groceries"');
  });

  it("lists tasks after adding", () => {
    runCli(["add", "Task one"]);
    runCli(["add", "Task two"]);
    const { stdout } = runCli(["list"]);

    expect(stdout).toContain("Task one");
    expect(stdout).toContain("Task two");
    expect(stdout).toContain("Total: 2");
  });

  it("marks a task as done", () => {
    runCli(["add", "Finish homework"]);
    const { stdout } = runCli(["done", "1"]);
    expect(stdout).toContain("marked as done");
  });

  it("deletes a task", () => {
    runCli(["add", "Temporary task"]);
    const { stdout } = runCli(["delete", "1"]);
    expect(stdout).toContain("deleted");
  });

  it("updates a task title", () => {
    runCli(["add", "Old title"]);
    const { stdout } = runCli(["update", "1", "New title"]);
    expect(stdout).toContain("updated");
    expect(stdout).toContain("New title");
  });

  it("filters tasks by status", () => {
    runCli(["add", "Todo task"]);
    runCli(["add", "Done task"]);
    runCli(["done", "2"]);

    const { stdout: todoList } = runCli(["list", "--status", "todo"]);
    expect(todoList).toContain("Todo task");
    expect(todoList).not.toContain("Done task");

    const { stdout: doneList } = runCli(["list", "--status", "done"]);
    expect(doneList).toContain("Done task");
    expect(doneList).not.toContain("Todo task");
  });

  it("shows friendly message when no tasks exist", () => {
    const { stdout } = runCli(["list"]);
    expect(stdout).toContain("No tasks yet");
  });

  it("shows error for empty title", () => {
    const { stderr } = runCli(["add", ""], true);
    expect(stderr).toContain("cannot be empty");
  });

  it("shows error for non-existent task ID", () => {
    const { stderr } = runCli(["done", "999"], true);
    expect(stderr).toContain("No task found");
  });

  it("shows error for invalid task ID", () => {
    const { stderr } = runCli(["done", "abc"], true);
    expect(stderr).toContain("not a valid task ID");
  });

  it("persists data between separate CLI invocations", () => {
    runCli(["add", "Persistent task"]);
    // Second invocation (simulates new terminal session)
    const { stdout } = runCli(["list"]);
    expect(stdout).toContain("Persistent task");
  });

  it("undo removes a task that was just added", () => {
    runCli(["add", "Mistake task"]);
    runCli(["undo"]);
    const { stdout } = runCli(["list"]);
    expect(stdout).toContain("No tasks yet");
  });

  it("undo restores a deleted task", () => {
    runCli(["add", "Important task"]);
    runCli(["delete", "1"]);
    runCli(["undo"]);
    const { stdout } = runCli(["list"]);
    expect(stdout).toContain("Important task");
  });

  it("undo shows error when nothing to undo", () => {
    const { stderr } = runCli(["undo"], true);
    expect(stderr).toContain("Nothing to undo");
  });

  it("marks a done task back to todo", () => {
    runCli(["add", "Task"]);
    runCli(["done", "1"]);
    const { stdout } = runCli(["todo", "1"]);
    expect(stdout).toContain("marked as todo");
  });

  it("shows error when todo-ing an already-todo task", () => {
    runCli(["add", "Task"]);
    const { stderr } = runCli(["todo", "1"], true);
    expect(stderr).toContain("already marked as todo");
  });

  it("adds a task with a due date visible in the list", () => {
    runCli(["add", "Doctor visit", "--due", "december 31"]);
    const { stdout } = runCli(["list"]);
    expect(stdout).toContain("Doctor visit");
    expect(stdout).toContain("Dec 31");
  });

  it("shows error for invalid due date", () => {
    const { stderr } = runCli(["add", "Task", "--due", "feb 30"], true);
    expect(stderr).toContain("Invalid date");
  });

  it("adds tasks with tags and shows each tag as a separate section header", () => {
    runCli(["add", "Fix bug", "--tag", "work"]);
    runCli(["add", "Read chapter", "--tag", "school"]);
    const { stdout } = runCli(["list"]);
    expect(stdout).toContain("SCHOOL");
    expect(stdout).toContain("WORK");
    expect(stdout).toContain("Fix bug");
    expect(stdout).toContain("Read chapter");
  });

  it("assigns independent IDs per tag", () => {
    runCli(["add", "Work task 1", "--tag", "work"]);
    runCli(["add", "Gym task 1",  "--tag", "gym"]);
    runCli(["add", "Work task 2", "--tag", "work"]);
    const { stdout } = runCli(["list"]);
    // Both tags should show IDs starting from 1
    expect(stdout).toContain("Work task 1");
    expect(stdout).toContain("Work task 2");
    expect(stdout).toContain("Gym task 1");
  });

  it("requires --tag when targeting a task that only exists in tagged groups", () => {
    runCli(["add", "Work task", "--tag", "work"]);
    runCli(["add", "Gym task",  "--tag", "gym"]);
    // Both are ID 1 in their respective tags — no untagged task with ID 1
    const { stderr } = runCli(["done", "1"], true);
    expect(stderr).toContain("belongs to a tag");
  });

  it("targets untagged task by ID when same ID also exists in a tagged group", () => {
    runCli(["add", "Untagged task"]);          // ID 1, no tag
    runCli(["add", "Work task", "--tag", "work"]); // ID 1 in work
    const { stdout } = runCli(["done", "1"]);  // no --tag → targets untagged
    expect(stdout).toContain("Untagged task");
    expect(stdout).toContain("marked as done");
  });

  it("marks done with --tag when same ID exists in multiple tags", () => {
    runCli(["add", "Work task", "--tag", "work"]);
    runCli(["add", "Gym task",  "--tag", "gym"]);
    const { stdout } = runCli(["done", "1", "--tag", "work"]);
    expect(stdout).toContain("marked as done");
    expect(stdout).toContain("Work task");
  });

  it("deletes with --tag when same ID exists in multiple tags", () => {
    runCli(["add", "Work task", "--tag", "work"]);
    runCli(["add", "Gym task",  "--tag", "gym"]);
    const { stdout } = runCli(["delete", "1", "--tag", "gym"]);
    expect(stdout).toContain("deleted");
    expect(stdout).toContain("Gym task");
  });

  it("updates due date with update-due command", () => {
    runCli(["add", "Doctor visit"]);
    const { stdout } = runCli(["update-due", "1", "december 25"]);
    expect(stdout).toContain("due date updated");
    expect(stdout).toContain("Dec 25");
  });

  it("shows error for invalid due date in update-due", () => {
    runCli(["add", "Task"]);
    const { stderr } = runCli(["update-due", "1", "feb 30"], true);
    expect(stderr).toContain("Invalid date");
  });

  it("update-due requires --tag when targeting tagged-only tasks", () => {
    runCli(["add", "Work task", "--tag", "work"]);
    runCli(["add", "Gym task",  "--tag", "gym"]);
    const { stderr } = runCli(["update-due", "1", "december 25"], true);
    expect(stderr).toContain("belongs to a tag");
  });

  it("handles full workflow: add, done, list, delete", () => {
    runCli(["add", "Step 1"]);
    runCli(["add", "Step 2"]);
    runCli(["done", "1"]);
    runCli(["delete", "2"]);

    const { stdout } = runCli(["list"]);
    expect(stdout).toContain("Step 1");
    expect(stdout).toContain("done");
    expect(stdout).not.toContain("Step 2");
    expect(stdout).toContain("Total: 1");
  });

  it("adds a task with priority and shows it in the list", () => {
    runCli(["add", "Fix bug", "--priority", "high"]);
    const { stdout } = runCli(["list"]);
    expect(stdout).toContain("high");
  });

  it("shows error for invalid priority", () => {
    const { stderr } = runCli(["add", "Task", "--priority", "urgent"], true);
    expect(stderr).toContain("Invalid priority");
  });

  it("tasks without due date show 'none' in the list", () => {
    runCli(["add", "No due date task"]);
    const { stdout } = runCli(["list"]);
    expect(stdout).toContain("none");
  });

  it("sorts tasks by priority high-first with --sort priority", () => {
    runCli(["add", "Low task",  "--priority", "low"]);
    runCli(["add", "High task", "--priority", "high"]);
    const { stdout } = runCli(["list", "--sort", "priority"]);
    const highPos = stdout.indexOf("high");
    const lowPos  = stdout.indexOf("low");
    expect(highPos).toBeLessThan(lowPos);
  });

  it("sorts tasks by priority low-first with --sort priority-asc", () => {
    runCli(["add", "High task", "--priority", "high"]);
    runCli(["add", "Low task",  "--priority", "low"]);
    const { stdout } = runCli(["list", "--sort", "priority-asc"]);
    const highPos = stdout.indexOf("High task");
    const lowPos  = stdout.indexOf("Low task");
    expect(lowPos).toBeLessThan(highPos);
  });

  it("sorts tasks by closest due date with --sort due", () => {
    runCli(["add", "Far task",   "--due", "december 31"]);
    runCli(["add", "Close task", "--due", "april 1"]);
    const { stdout } = runCli(["list", "--sort", "due"]);
    const closePos = stdout.indexOf("Close task");
    const farPos   = stdout.indexOf("Far task");
    expect(closePos).toBeLessThan(farPos);
  });

  it("shows error for invalid --sort value", () => {
    const { stderr } = runCli(["list", "--sort", "random"], true);
    expect(stderr).toContain("Invalid sort field");
  });

  it("clears all tasks with the clear command", () => {
    runCli(["add", "Task 1"]);
    runCli(["add", "Task 2"]);
    const { stdout } = runCli(["clear"]);
    expect(stdout).toContain("Cleared 2 task(s)");
    const { stdout: listOut } = runCli(["list"]);
    expect(listOut).toContain("No tasks yet");
  });

  it("shows message when clearing an empty list", () => {
    const { stdout } = runCli(["clear"]);
    expect(stdout).toContain("already empty");
  });

  it("undo after clear restores all tasks", () => {
    runCli(["add", "Important task"]);
    runCli(["add", "Another task"]);
    runCli(["clear"]);
    runCli(["undo"]);
    const { stdout } = runCli(["list"]);
    expect(stdout).toContain("Important task");
    expect(stdout).toContain("Another task");
  });
});
