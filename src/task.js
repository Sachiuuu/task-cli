const MAX_TITLE_LENGTH = 200;

function validateTitle(title) {
  if (typeof title !== "string" || title.trim().length === 0) {
    return { valid: false, message: "Task title cannot be empty. Please provide a title for your task." };
  }

  if (title.trim().length > MAX_TITLE_LENGTH) {
    return { valid: false, message: `Task title is too long (max ${MAX_TITLE_LENGTH} characters). Please use a shorter title.` };
  }

  return { valid: true };
}

function findTask(data, id) {
  const numId = Number(id);

  if (isNaN(numId) || !Number.isInteger(numId) || numId <= 0) {
    return { error: `"${id}" is not a valid task ID. Please use a positive number (e.g., task-cli done 1).` };
  }

  const task = data.tasks.find((t) => t.id === numId);

  if (!task) {
    return { error: `No task found with ID ${numId}. Run 'task-cli list' to see your tasks.` };
  }

  return { task };
}

function addTask(data, title) {
  const validation = validateTitle(title);
  if (!validation.valid) {
    return { error: validation.message };
  }

  const now = new Date().toISOString();
  const task = {
    id: data.nextId,
    title: title.trim(),
    status: "todo",
    createdAt: now,
    updatedAt: now,
  };

  data.tasks.push(task);
  data.nextId++;

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

function markDone(data, id) {
  const result = findTask(data, id);
  if (result.error) return result;

  if (result.task.status === "done") {
    return { error: `Task #${result.task.id} is already marked as done.` };
  }

  result.task.status = "done";
  result.task.updatedAt = new Date().toISOString();

  return { task: result.task };
}

function deleteTask(data, id) {
  const result = findTask(data, id);
  if (result.error) return result;

  const index = data.tasks.indexOf(result.task);
  data.tasks.splice(index, 1);

  return { task: result.task };
}

function updateTask(data, id, newTitle) {
  const validation = validateTitle(newTitle);
  if (!validation.valid) {
    return { error: validation.message };
  }

  const result = findTask(data, id);
  if (result.error) return result;

  result.task.title = newTitle.trim();
  result.task.updatedAt = new Date().toISOString();

  return { task: result.task };
}

module.exports = { addTask, listTasks, markDone, deleteTask, updateTask };
