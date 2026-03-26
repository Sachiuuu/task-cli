const fs = require("fs");
const path = require("path");
const os = require("os");

const DEFAULT_DATA_PATH = path.join(os.homedir(), ".task-cli-data.json");

function getDataPath() {
  return process.env.TASK_CLI_DATA_PATH || DEFAULT_DATA_PATH;
}

function getDefaultData() {
  return { tagCounters: {}, tasks: [], undo: null };
}

// Migrate from old global nextId format to per-tag tagCounters
function migrateFromNextId(data) {
  const groups = {};
  for (const task of data.tasks) {
    const key = task.tag || "";
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  }

  const tagCounters = {};
  for (const [key, tasks] of Object.entries(groups)) {
    tasks.sort((a, b) => a.id - b.id);
    tasks.forEach((t, i) => { t.id = i + 1; });
    tagCounters[key] = tasks.length + 1;
  }

  return { tagCounters, tasks: data.tasks, undo: data.undo || null };
}

function loadData() {
  const filePath = getDataPath();

  if (!fs.existsSync(filePath)) {
    return getDefaultData();
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    if (!data || !Array.isArray(data.tasks)) {
      console.warn("Warning: Data file was corrupted. Starting with an empty task list.");
      return getDefaultData();
    }

    // Migrate from old nextId-based format
    if (typeof data.nextId === "number" && !data.tagCounters) {
      return migrateFromNextId(data);
    }

    if (!data.tagCounters || typeof data.tagCounters !== "object" || Array.isArray(data.tagCounters)) {
      console.warn("Warning: Data file was corrupted. Starting with an empty task list.");
      return getDefaultData();
    }

    if (!("undo" in data)) {
      data.undo = null;
    }

    return data;
  } catch (err) {
    console.warn("Warning: Could not read data file. Starting with an empty task list.");
    return getDefaultData();
  }
}

function saveData(data) {
  const filePath = getDataPath();
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = { loadData, saveData, getDataPath };
