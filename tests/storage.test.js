const fs = require("fs");
const path = require("path");
const os = require("os");

const tmpDir = os.tmpdir();
let testFilePath;

beforeEach(() => {
  testFilePath = path.join(tmpDir, `task-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  process.env.TASK_CLI_DATA_PATH = testFilePath;

  // Clear the require cache so each test gets a fresh module
  delete require.cache[require.resolve("../src/storage")];
});

afterEach(() => {
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
  delete process.env.TASK_CLI_DATA_PATH;
});

describe("storage", () => {
  it("returns default data when file does not exist", () => {
    const { loadData } = require("../src/storage");
    const data = loadData();

    expect(data).toEqual({ tagCounters: {}, tasks: [], undo: null });
  });

  it("saves and loads data correctly (round-trip)", () => {
    const { loadData, saveData } = require("../src/storage");
    const original = {
      tagCounters: { "": 3 },
      tasks: [
        { id: 1, title: "Test task", status: "todo", tag: null, dueDate: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: 2, title: "Done task", status: "done", tag: null, dueDate: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" },
      ],
      undo: null,
    };

    saveData(original);
    const loaded = loadData();

    expect(loaded).toEqual(original);
  });

  it("handles corrupted JSON gracefully", () => {
    const { loadData } = require("../src/storage");
    fs.writeFileSync(testFilePath, "this is not valid json{{{", "utf-8");

    const data = loadData();

    expect(data).toEqual({ tagCounters: {}, tasks: [], undo: null });
  });

  it("handles JSON with invalid structure gracefully", () => {
    const { loadData } = require("../src/storage");
    fs.writeFileSync(testFilePath, JSON.stringify({ foo: "bar" }), "utf-8");

    const data = loadData();

    expect(data).toEqual({ tagCounters: {}, tasks: [], undo: null });
  });

  it("migrates old nextId format to tagCounters", () => {
    const { loadData } = require("../src/storage");
    const oldFormat = {
      nextId: 3,
      tasks: [
        { id: 1, title: "Task A", status: "todo", tag: null, dueDate: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: 2, title: "Task B", status: "done", tag: "work", dueDate: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" },
      ],
      undo: null,
    };
    fs.writeFileSync(testFilePath, JSON.stringify(oldFormat), "utf-8");

    const data = loadData();

    expect(data.tagCounters[""]).toBe(2);  // 1 untagged task → counter = 2
    expect(data.tagCounters["work"]).toBe(2); // 1 work task → counter = 2
    expect(data.tasks[0].id).toBe(1); // renumbered within tag
    expect(data.tasks[1].id).toBe(1); // renumbered within tag
  });

  it("persists data between separate load calls (simulates closing and reopening terminal)", () => {
    const { saveData } = require("../src/storage");
    const original = {
      tagCounters: { "": 2 },
      tasks: [{ id: 1, title: "Persistent task", status: "todo", tag: null, dueDate: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
      undo: null,
    };

    saveData(original);

    // Clear cache to simulate a fresh process
    delete require.cache[require.resolve("../src/storage")];
    const { loadData: loadData2 } = require("../src/storage");
    process.env.TASK_CLI_DATA_PATH = testFilePath;

    const loaded = loadData2();
    expect(loaded).toEqual(original);
  });

  it("creates parent directories if they don't exist", () => {
    const nestedPath = path.join(tmpDir, `task-cli-nested-${Date.now()}`, "subdir", "data.json");
    process.env.TASK_CLI_DATA_PATH = nestedPath;
    delete require.cache[require.resolve("../src/storage")];
    const { saveData, loadData } = require("../src/storage");

    const data = { tagCounters: {}, tasks: [], undo: null };
    saveData(data);
    const loaded = loadData();

    expect(loaded).toEqual(data);

    // Cleanup
    fs.unlinkSync(nestedPath);
    fs.rmdirSync(path.dirname(nestedPath));
    fs.rmdirSync(path.dirname(path.dirname(nestedPath)));
  });
});
