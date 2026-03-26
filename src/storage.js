const fs = require("fs");
const path = require("path");
const os = require("os");

const DEFAULT_DATA_PATH = path.join(os.homedir(), ".task-cli-data.json");

function getDataPath() {
  return process.env.TASK_CLI_DATA_PATH || DEFAULT_DATA_PATH;
}

function getDefaultData() {
  return { nextId: 1, tasks: [] };
}

function loadData() {
  const filePath = getDataPath();

  if (!fs.existsSync(filePath)) {
    return getDefaultData();
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    if (!data || !Array.isArray(data.tasks) || typeof data.nextId !== "number") {
      console.warn("Warning: Data file was corrupted. Starting with an empty task list.");
      return getDefaultData();
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
