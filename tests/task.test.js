const { addTask, listTasks, markDone, deleteTask, updateTask } = require("../src/task");

let data;

beforeEach(() => {
  data = { nextId: 1, tasks: [] };
});

describe("addTask", () => {
  it("adds a task with correct fields", () => {
    const result = addTask(data, "Buy groceries");

    expect(result.error).toBeUndefined();
    expect(result.task.id).toBe(1);
    expect(result.task.title).toBe("Buy groceries");
    expect(result.task.status).toBe("todo");
    expect(result.task.createdAt).toBeDefined();
    expect(result.task.updatedAt).toBeDefined();
    expect(data.tasks).toHaveLength(1);
    expect(data.nextId).toBe(2);
  });

  it("trims whitespace from title", () => {
    const result = addTask(data, "  Buy groceries  ");
    expect(result.task.title).toBe("Buy groceries");
  });

  it("auto-increments IDs", () => {
    addTask(data, "Task 1");
    addTask(data, "Task 2");
    addTask(data, "Task 3");

    expect(data.tasks[0].id).toBe(1);
    expect(data.tasks[1].id).toBe(2);
    expect(data.tasks[2].id).toBe(3);
    expect(data.nextId).toBe(4);
  });

  it("rejects empty title", () => {
    const result = addTask(data, "");
    expect(result.error).toContain("cannot be empty");
    expect(data.tasks).toHaveLength(0);
  });

  it("rejects whitespace-only title", () => {
    const result = addTask(data, "   ");
    expect(result.error).toContain("cannot be empty");
  });

  it("rejects title longer than 200 characters", () => {
    const longTitle = "a".repeat(201);
    const result = addTask(data, longTitle);
    expect(result.error).toContain("too long");
  });

  it("accepts title exactly 200 characters", () => {
    const title = "a".repeat(200);
    const result = addTask(data, title);
    expect(result.error).toBeUndefined();
    expect(result.task.title).toBe(title);
  });

  it("rejects non-string title", () => {
    const result = addTask(data, undefined);
    expect(result.error).toContain("cannot be empty");
  });

  it("renumbers IDs sequentially after deletion", () => {
    addTask(data, "Task 1");
    addTask(data, "Task 2");
    addTask(data, "Task 3");
    deleteTask(data, 2);

    expect(data.tasks.map((t) => t.id)).toEqual([1, 2]);
    expect(data.nextId).toBe(3);
  });
});

describe("listTasks", () => {
  beforeEach(() => {
    addTask(data, "Todo task");
    addTask(data, "Done task");
    markDone(data, 2);
  });

  it("returns all tasks without filter", () => {
    const result = listTasks(data);
    expect(result.tasks).toHaveLength(2);
  });

  it("filters by todo status", () => {
    const result = listTasks(data, "todo");
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].status).toBe("todo");
  });

  it("filters by done status", () => {
    const result = listTasks(data, "done");
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].status).toBe("done");
  });

  it("rejects invalid status filter", () => {
    const result = listTasks(data, "invalid");
    expect(result.error).toContain("Invalid status");
  });

  it("returns empty array when no tasks match filter", () => {
    const emptyData = { nextId: 1, tasks: [] };
    const result = listTasks(emptyData, "todo");
    expect(result.tasks).toHaveLength(0);
  });
});

describe("markDone", () => {
  beforeEach(() => {
    addTask(data, "Test task");
  });

  it("marks a task as done", () => {
    const result = markDone(data, 1);
    expect(result.task.status).toBe("done");
    expect(result.task.updatedAt).toBeDefined();
  });

  it("updates the updatedAt timestamp", () => {
    const before = data.tasks[0].updatedAt;
    // Small delay to ensure different timestamp
    const result = markDone(data, 1);
    expect(result.task.updatedAt).toBeDefined();
  });

  it("returns error for non-existent ID", () => {
    const result = markDone(data, 999);
    expect(result.error).toContain("No task found");
  });

  it("returns error for already done task", () => {
    markDone(data, 1);
    const result = markDone(data, 1);
    expect(result.error).toContain("already marked as done");
  });

  it("returns error for non-numeric ID", () => {
    const result = markDone(data, "abc");
    expect(result.error).toContain("not a valid task ID");
  });

  it("returns error for negative ID", () => {
    const result = markDone(data, -1);
    expect(result.error).toContain("not a valid task ID");
  });

  it("returns error for zero ID", () => {
    const result = markDone(data, 0);
    expect(result.error).toContain("not a valid task ID");
  });
});

describe("deleteTask", () => {
  beforeEach(() => {
    addTask(data, "Task to delete");
    addTask(data, "Task to keep");
  });

  it("removes the task and renumbers remaining tasks from 1", () => {
    const result = deleteTask(data, 1);
    expect(result.task.title).toBe("Task to delete");
    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].id).toBe(1);
    expect(data.nextId).toBe(2);
  });

  it("returns error for non-existent ID", () => {
    const result = deleteTask(data, 999);
    expect(result.error).toContain("No task found");
  });
});

describe("updateTask", () => {
  beforeEach(() => {
    addTask(data, "Original title");
  });

  it("updates the task title", () => {
    const result = updateTask(data, 1, "New title");
    expect(result.task.title).toBe("New title");
  });

  it("updates the updatedAt timestamp", () => {
    const result = updateTask(data, 1, "New title");
    expect(result.task.updatedAt).toBeDefined();
  });

  it("returns error for empty new title", () => {
    const result = updateTask(data, 1, "");
    expect(result.error).toContain("cannot be empty");
  });

  it("returns error for non-existent ID", () => {
    const result = updateTask(data, 999, "New title");
    expect(result.error).toContain("No task found");
  });
});
