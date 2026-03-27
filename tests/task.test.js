const { addTask, listTasks, markDone, markTodo, deleteTask, updateTask, updateDueDate, undoAction, parseDueDate, clearAll } = require("../src/task");

let data;

beforeEach(() => {
  data = { tagCounters: {}, tasks: [], undo: null };
});

describe("addTask", () => {
  it("adds a task with correct fields", () => {
    const result = addTask(data, "Buy groceries");

    expect(result.error).toBeUndefined();
    expect(result.task.id).toBe(1);
    expect(result.task.title).toBe("Buy groceries");
    expect(result.task.status).toBe("todo");
    expect(result.task.priority).toBeNull();
    expect(result.task.tag).toBeNull();
    expect(result.task.dueDate).toBeNull();
    expect(result.task.createdAt).toBeDefined();
    expect(result.task.updatedAt).toBeDefined();
    expect(data.tasks).toHaveLength(1);
    expect(data.tagCounters[""]).toBe(2);
  });

  it("adds a task with priority high", () => {
    const result = addTask(data, "Fix bug", { priority: "high" });
    expect(result.task.priority).toBe("high");
  });

  it("normalizes priority to lowercase", () => {
    const result = addTask(data, "Fix bug", { priority: "HIGH" });
    expect(result.task.priority).toBe("high");
  });

  it("accepts all valid priority values", () => {
    expect(addTask(data, "A", { priority: "high" }).task.priority).toBe("high");
    expect(addTask(data, "B", { priority: "medium" }).task.priority).toBe("medium");
    expect(addTask(data, "C", { priority: "low" }).task.priority).toBe("low");
  });

  it("returns error for invalid priority", () => {
    const result = addTask(data, "Task", { priority: "urgent" });
    expect(result.error).toContain("Invalid priority");
  });

  it("defaults priority to null when not specified", () => {
    const result = addTask(data, "Task");
    expect(result.task.priority).toBeNull();
  });

  it("adds a task with a tag (lowercased)", () => {
    const result = addTask(data, "Fix bug", { tag: "Work" });
    expect(result.task.tag).toBe("work");
    expect(result.task.id).toBe(1);
    expect(data.tagCounters["work"]).toBe(2);
  });

  it("adds a task with a due date", () => {
    const result = addTask(data, "Doctor appointment", { dueDate: "2026-12-25" });
    expect(result.task.dueDate).toBe("2026-12-25");
  });

  it("assigns independent IDs per tag", () => {
    addTask(data, "Work task 1", { tag: "work" });
    addTask(data, "Gym task 1",  { tag: "gym" });
    addTask(data, "Work task 2", { tag: "work" });
    addTask(data, "Gym task 2",  { tag: "gym" });

    const workTasks = data.tasks.filter((t) => t.tag === "work");
    const gymTasks  = data.tasks.filter((t) => t.tag === "gym");

    expect(workTasks.map((t) => t.id)).toEqual([1, 2]);
    expect(gymTasks.map((t) => t.id)).toEqual([1, 2]);
    expect(data.tagCounters["work"]).toBe(3);
    expect(data.tagCounters["gym"]).toBe(3);
  });

  it("rejects empty tag", () => {
    const result = addTask(data, "Task", { tag: "  " });
    expect(result.error).toContain("Tag cannot be empty");
  });

  it("rejects tag longer than 30 characters", () => {
    const result = addTask(data, "Task", { tag: "a".repeat(31) });
    expect(result.error).toContain("too long");
  });

  it("trims whitespace from title", () => {
    const result = addTask(data, "  Buy groceries  ");
    expect(result.task.title).toBe("Buy groceries");
  });

  it("auto-increments IDs within the same tag", () => {
    addTask(data, "Task 1");
    addTask(data, "Task 2");
    addTask(data, "Task 3");

    expect(data.tasks[0].id).toBe(1);
    expect(data.tasks[1].id).toBe(2);
    expect(data.tasks[2].id).toBe(3);
    expect(data.tagCounters[""]).toBe(4);
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

  it("renumbers IDs sequentially within the same tag after deletion", () => {
    addTask(data, "Task 1");
    addTask(data, "Task 2");
    addTask(data, "Task 3");
    deleteTask(data, 2);

    expect(data.tasks.map((t) => t.id)).toEqual([1, 2]);
    expect(data.tagCounters[""]).toBe(3);
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
    const emptyData = { tagCounters: {}, tasks: [] };
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

  it("targets tagged task when --tag is specified", () => {
    addTask(data, "Work task", { tag: "work" });
    // ID 1 exists in both "" (untagged) and "work"
    const result = markDone(data, 1, "work");
    expect(result.task.tag).toBe("work");
    expect(result.task.status).toBe("done");
  });

  it("without --tag, targets the untagged task even when same ID exists in tagged group", () => {
    addTask(data, "Work task", { tag: "work" });
    // ID 1 in both "" (untagged, from beforeEach) and "work"
    const result = markDone(data, 1); // no tag → targets untagged "Test task"
    expect(result.task.tag).toBeNull();
    expect(result.task.status).toBe("done");
  });

  it("returns error when targeting a tagged-only task without --tag", () => {
    const freshData = { tagCounters: {}, tasks: [], undo: null };
    addTask(freshData, "Work task", { tag: "work" }); // only tagged task, ID 1
    const result = markDone(freshData, 1); // no untagged task with ID 1
    expect(result.error).toContain("belongs to a tag");
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
    expect(data.tagCounters[""]).toBe(2);
  });

  it("returns error for non-existent ID", () => {
    const result = deleteTask(data, 999);
    expect(result.error).toContain("No task found");
  });

  it("renumbers only within the same tag, not across tags", () => {
    addTask(data, "Work task 1", { tag: "work" });
    addTask(data, "Work task 2", { tag: "work" });
    deleteTask(data, 1, "work");

    const workTasks = data.tasks.filter((t) => t.tag === "work");
    expect(workTasks).toHaveLength(1);
    expect(workTasks[0].id).toBe(1);
    expect(data.tagCounters["work"]).toBe(2);

    // Untagged tasks should be untouched
    const untagged = data.tasks.filter((t) => !t.tag);
    expect(untagged).toHaveLength(2);
    expect(untagged.map((t) => t.id)).toEqual([1, 2]);
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

describe("markTodo", () => {
  beforeEach(() => {
    addTask(data, "Test task");
    markDone(data, 1);
  });

  it("marks a done task back to todo", () => {
    const result = markTodo(data, 1);
    expect(result.task.status).toBe("todo");
    expect(result.task.updatedAt).toBeDefined();
  });

  it("returns error for already todo task", () => {
    markTodo(data, 1);
    const result = markTodo(data, 1);
    expect(result.error).toContain("already marked as todo");
  });

  it("returns error for non-existent ID", () => {
    const result = markTodo(data, 999);
    expect(result.error).toContain("No task found");
  });
});

describe("updateDueDate", () => {
  beforeEach(() => {
    addTask(data, "Task with due date", { dueDate: "2026-06-01" });
  });

  it("updates the due date", () => {
    const result = updateDueDate(data, 1, "2026-12-25");
    expect(result.task.dueDate).toBe("2026-12-25");
    expect(result.task.updatedAt).toBeDefined();
  });

  it("clears due date when set to null", () => {
    const result = updateDueDate(data, 1, null);
    expect(result.task.dueDate).toBeNull();
  });

  it("returns error for non-existent ID", () => {
    const result = updateDueDate(data, 999, "2026-12-25");
    expect(result.error).toContain("No task found");
  });

  it("updates by tag when same ID exists in multiple tags", () => {
    addTask(data, "Work task", { tag: "work", dueDate: "2026-06-01" });
    const result = updateDueDate(data, 1, "2026-12-31", "work");
    expect(result.task.tag).toBe("work");
    expect(result.task.dueDate).toBe("2026-12-31");
  });
});

describe("parseDueDate", () => {
  it('parses "march 15" format', () => {
    const { dueDate } = parseDueDate("march 15");
    expect(dueDate).toMatch(/^\d{4}-03-15$/);
  });

  it('parses "mar 15" abbreviated month', () => {
    const { dueDate } = parseDueDate("mar 15");
    expect(dueDate).toMatch(/^\d{4}-03-15$/);
  });

  it('parses "3/15" slash format', () => {
    const { dueDate } = parseDueDate("3/15");
    expect(dueDate).toMatch(/^\d{4}-03-15$/);
  });

  it('parses "3-15" dash format', () => {
    const { dueDate } = parseDueDate("3-15");
    expect(dueDate).toMatch(/^\d{4}-03-15$/);
  });

  it('parses "15 march" day-first format', () => {
    const { dueDate } = parseDueDate("15 march");
    expect(dueDate).toMatch(/^\d{4}-03-15$/);
  });

  it("returns error for unrecognized format", () => {
    const { error } = parseDueDate("next friday");
    expect(error).toContain("Cannot parse due date");
  });

  it("returns error for invalid month", () => {
    const { error } = parseDueDate("13/15");
    expect(error).toContain("Invalid month");
  });

  it("returns error for impossible date (Feb 30)", () => {
    const { error } = parseDueDate("feb 30");
    expect(error).toContain("Invalid date");
  });

  it("returns error for invalid day (0)", () => {
    const { error } = parseDueDate("3/0");
    expect(error).toContain("Invalid day");
  });

  it("always returns a YYYY-MM-DD string", () => {
    const { dueDate } = parseDueDate("december 31");
    expect(dueDate).toMatch(/^\d{4}-12-31$/);
  });
});

describe("undoAction", () => {
  it("returns error when nothing to undo", () => {
    const result = undoAction(data);
    expect(result.error).toContain("Nothing to undo");
  });

  it("undoes an add — removes the added task", () => {
    addTask(data, "Task to undo");
    expect(data.tasks).toHaveLength(1);

    undoAction(data);

    expect(data.tasks).toHaveLength(0);
    expect(data.tagCounters[""]).toBeUndefined();
  });

  it("undoes a delete — restores the deleted task", () => {
    addTask(data, "Task A");
    addTask(data, "Task B");
    deleteTask(data, 1);
    expect(data.tasks).toHaveLength(1);

    undoAction(data);

    expect(data.tasks).toHaveLength(2);
    expect(data.tasks[0].title).toBe("Task A");
    expect(data.tasks[1].title).toBe("Task B");
  });

  it("undoes a done — restores task to todo", () => {
    addTask(data, "Task A");
    markDone(data, 1);
    expect(data.tasks[0].status).toBe("done");

    undoAction(data);

    expect(data.tasks[0].status).toBe("todo");
  });

  it("undoes an update — restores old title", () => {
    addTask(data, "Old title");
    updateTask(data, 1, "New title");
    expect(data.tasks[0].title).toBe("New title");

    undoAction(data);

    expect(data.tasks[0].title).toBe("Old title");
  });

  it("undoes an update-due — restores old due date", () => {
    addTask(data, "Task", { dueDate: "2026-06-01" });
    updateDueDate(data, 1, "2026-12-25");
    expect(data.tasks[0].dueDate).toBe("2026-12-25");

    undoAction(data);

    expect(data.tasks[0].dueDate).toBe("2026-06-01");
  });

  it("clears undo state after use — cannot undo twice", () => {
    addTask(data, "Task");
    undoAction(data);

    const result = undoAction(data);
    expect(result.error).toContain("Nothing to undo");
  });

  it("saves undo snapshot before each mutation", () => {
    addTask(data, "Task 1");
    addTask(data, "Task 2");
    // undo only goes back one step (last mutation)
    undoAction(data);

    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].title).toBe("Task 1");
  });

  it("restores tagCounters on undo", () => {
    addTask(data, "Work task", { tag: "work" });
    expect(data.tagCounters["work"]).toBe(2);

    undoAction(data);

    expect(data.tagCounters["work"]).toBeUndefined();
  });
});

describe("clearAll", () => {
  it("clears all tasks and resets tagCounters", () => {
    addTask(data, "Task A");
    addTask(data, "Task B", { tag: "work" });
    expect(data.tasks).toHaveLength(2);

    const result = clearAll(data);

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(data.tasks).toHaveLength(0);
    expect(data.tagCounters).toEqual({});
  });

  it("returns error when no tasks exist", () => {
    const result = clearAll(data);
    expect(result.error).toContain("already empty");
  });

  it("returns the count of cleared tasks", () => {
    addTask(data, "A");
    addTask(data, "B");
    addTask(data, "C");
    const result = clearAll(data);
    expect(result.count).toBe(3);
  });

  it("undo after clearAll restores all tasks and tagCounters", () => {
    addTask(data, "Keep me", { tag: "work", priority: "high" });
    addTask(data, "Keep me too");
    clearAll(data);
    expect(data.tasks).toHaveLength(0);

    undoAction(data);

    expect(data.tasks).toHaveLength(2);
    expect(data.tagCounters["work"]).toBe(2);
    expect(data.tagCounters[""]).toBe(2);
  });

  it("saves undo snapshot before clearing", () => {
    addTask(data, "Task");
    clearAll(data);
    expect(data.undo).not.toBeNull();
  });
});
