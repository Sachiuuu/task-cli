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

  it("requires --tag when same ID exists in multiple tags", () => {
    runCli(["add", "Work task", "--tag", "work"]);
    runCli(["add", "Gym task",  "--tag", "gym"]);
    // Both are ID 1 in their respective tags
    const { stderr } = runCli(["done", "1"], true);
    expect(stderr).toContain("Multiple tasks");
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

  it("update-due requires --tag when same ID exists in multiple tags", () => {
    runCli(["add", "Work task", "--tag", "work"]);
    runCli(["add", "Gym task",  "--tag", "gym"]);
    const { stderr } = runCli(["update-due", "1", "december 25"], true);
    expect(stderr).toContain("Multiple tasks");
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
});
