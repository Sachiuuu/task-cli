const MAX_TITLE_LENGTH = 200;

const MONTH_MAP = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function saveUndoSnapshot(data) {
  data.undo = {
    tagCounters: { ...data.tagCounters },
    tasks: data.tasks.map((t) => ({ ...t })),
  };
}

function validateTitle(title) {
  if (typeof title !== "string" || title.trim().length === 0) {
    return { valid: false, message: "Task title cannot be empty. Please provide a title for your task." };
  }
  if (title.trim().length > MAX_TITLE_LENGTH) {
    return { valid: false, message: `Task title is too long (max ${MAX_TITLE_LENGTH} characters). Please use a shorter title.` };
  }
  return { valid: true };
}

// Find a task by id, optionally scoped to a tag.
// tag = undefined/null → search all tasks; multiple matches → error asking for --tag
function findTask(data, id, tag) {
  const numId = Number(id);
  if (isNaN(numId) || !Number.isInteger(numId) || numId <= 0) {
    return { error: `"${id}" is not a valid task ID. Please use a positive number (e.g., tsk done 1).` };
  }

  if (tag !== undefined && tag !== null) {
    const normTag = typeof tag === "string" ? tag.trim().toLowerCase() : "";
    const task = data.tasks.find((t) => t.id === numId && (t.tag || "") === normTag);
    if (!task) {
      const label = normTag || "(untagged)";
      return { error: `No task found with ID ${numId} in tag "${label}". Run 'tsk list' to see your tasks.` };
    }
    return { task };
  }

  const matches = data.tasks.filter((t) => t.id === numId);
  if (matches.length === 0) {
    return { error: `No task found with ID ${numId}. Run 'tsk list' to see your tasks.` };
  }
  if (matches.length > 1) {
    const tags = matches.map((t) => t.tag ? `"${t.tag}"` : '"(untagged)"').join(", ");
    return { error: `Multiple tasks with ID ${numId} exist across tags: ${tags}. Use --tag <tag> to specify which one.` };
  }
  return { task: matches[0] };
}

function parseDueDate(input) {
  if (!input || typeof input !== "string") {
    return { error: "Due date is required." };
  }

  const s = input.trim().toLowerCase();
  let month = null;
  let day = null;

  // Format: "3/15" or "3-15"
  const slashDash = s.match(/^(\d{1,2})[/\-](\d{1,2})$/);
  if (slashDash) {
    month = parseInt(slashDash[1]);
    day = parseInt(slashDash[2]);
  }

  // Format: "march 15", "mar 15", or "3 15"
  if (month === null) {
    const monthFirst = s.match(/^([a-z]+|\d{1,2})\s+(\d{1,2})$/);
    if (monthFirst) {
      const raw = monthFirst[1];
      if (MONTH_MAP[raw] !== undefined) {
        month = MONTH_MAP[raw];
      } else {
        const n = parseInt(raw);
        month = isNaN(n) ? null : n;
      }
      day = parseInt(monthFirst[2]);
    }
  }

  // Format: "15 march" or "15 mar"
  if (month === null) {
    const dayFirst = s.match(/^(\d{1,2})\s+([a-z]+)$/);
    if (dayFirst) {
      day = parseInt(dayFirst[1]);
      month = MONTH_MAP[dayFirst[2]] !== undefined ? MONTH_MAP[dayFirst[2]] : null;
    }
  }

  if (month === null || day === null || isNaN(month) || isNaN(day)) {
    return { error: `Cannot parse due date "${input}". Use formats like "march 15", "3/15", or "mar 15".` };
  }

  if (month < 1 || month > 12) {
    return { error: `Invalid month in "${input}". Month must be between 1 and 12.` };
  }

  if (day < 1 || day > 31) {
    return { error: `Invalid day in "${input}". Day must be between 1 and 31.` };
  }

  const now = new Date();
  let year = now.getFullYear();

  const candidate = new Date(year, month - 1, day);
  if (candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
    return { error: `Invalid date "${input}". Check the day is valid for that month (e.g., Feb only has 28/29 days).` };
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (candidate < today) {
    year++;
    const nextYear = new Date(year, month - 1, day);
    if (nextYear.getMonth() !== month - 1 || nextYear.getDate() !== day) {
      return { error: `Invalid date "${input}" for next year. Check the day is valid.` };
    }
  }

  return {
    dueDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

function addTask(data, title, { dueDate = null, tag = null, priority = null } = {}) {
  const validation = validateTitle(title);
  if (!validation.valid) return { error: validation.message };

  if (tag !== null) {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) return { error: "Tag cannot be empty." };
    if (trimmed.length > 30) return { error: "Tag is too long (max 30 characters)." };
    tag = trimmed;
  }

  if (priority !== null) {
    const norm = priority.trim().toLowerCase();
    if (!["high", "medium", "low"].includes(norm)) {
      return { error: `Invalid priority "${priority}". Use: high, medium, or low.` };
    }
    priority = norm;
  }

  saveUndoSnapshot(data);
  const tagKey = tag || "";
  if (data.tagCounters[tagKey] === undefined) data.tagCounters[tagKey] = 1;

  const now = new Date().toISOString();
  const task = {
    id: data.tagCounters[tagKey],
    title: title.trim(),
    status: "todo",
    priority,
    tag,
    dueDate,
    createdAt: now,
    updatedAt: now,
  };

  data.tagCounters[tagKey]++;
  data.tasks.push(task);

  return { task };
}

function listTasks(data, statusFilter) {
  let tasks = data.tasks;

  if (statusFilter) {
    const normalized = statusFilter.toLowerCase();
    if (normalized !== "todo" && normalized !== "done") {
      return { error: `Invalid status filter "${statusFilter}". Use "todo" or "done".` };
    }
    tasks = tasks.filter((t) => t.status === normalized);
  }

  return { tasks };
}

function markDone(data, id, tag) {
  const result = findTask(data, id, tag);
  if (result.error) return result;

  if (result.task.status === "done") {
    return { error: `Task #${result.task.id} is already marked as done.` };
  }

  saveUndoSnapshot(data);
  result.task.status = "done";
  result.task.updatedAt = new Date().toISOString();

  return { task: result.task };
}

function markTodo(data, id, tag) {
  const result = findTask(data, id, tag);
  if (result.error) return result;

  if (result.task.status === "todo") {
    return { error: `Task #${result.task.id} is already marked as todo.` };
  }

  saveUndoSnapshot(data);
  result.task.status = "todo";
  result.task.updatedAt = new Date().toISOString();

  return { task: result.task };
}

function deleteTask(data, id, tag) {
  const result = findTask(data, id, tag);
  if (result.error) return result;

  saveUndoSnapshot(data);
  const taskTag = result.task.tag || "";
  const index = data.tasks.indexOf(result.task);
  data.tasks.splice(index, 1);

  // Renumber remaining tasks with the same tag from 1
  const sameTagTasks = data.tasks.filter((t) => (t.tag || "") === taskTag);
  sameTagTasks.forEach((t, i) => { t.id = i + 1; });
  data.tagCounters[taskTag] = sameTagTasks.length + 1;

  return { task: result.task };
}

function updateTask(data, id, newTitle, tag) {
  const validation = validateTitle(newTitle);
  if (!validation.valid) return { error: validation.message };

  const result = findTask(data, id, tag);
  if (result.error) return result;

  saveUndoSnapshot(data);
  result.task.title = newTitle.trim();
  result.task.updatedAt = new Date().toISOString();

  return { task: result.task };
}

function updateDueDate(data, id, newDueDate, tag) {
  const result = findTask(data, id, tag);
  if (result.error) return result;

  saveUndoSnapshot(data);
  result.task.dueDate = newDueDate;
  result.task.updatedAt = new Date().toISOString();

  return { task: result.task };
}

function undoAction(data) {
  if (!data.undo) {
    return { error: "Nothing to undo. No previous action found." };
  }

  data.tasks = data.undo.tasks;
  data.tagCounters = data.undo.tagCounters;
  data.undo = null;

  return { success: true };
}

function clearAll(data) {
  if (data.tasks.length === 0) return { error: "No tasks to clear. The task list is already empty." };
  const count = data.tasks.length;
  saveUndoSnapshot(data);
  data.tasks = [];
  data.tagCounters = {};
  return { success: true, count };
}

module.exports = {
  addTask, listTasks, markDone, markTodo, deleteTask, updateTask, updateDueDate, undoAction, parseDueDate, clearAll,
};
