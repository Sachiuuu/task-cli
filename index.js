#!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const logSymbols = require("log-symbols");
const Table = require("cli-table3");
const prompts = require("prompts");
const { loadData, saveData } = require("./src/storage");
const {
  addTask, listTasks, markDone, markTodo, deleteTask, updateTask, updateDueDate, undoAction, parseDueDate, clearAll,
} = require("./src/task");

// ─── Tag emoji map ────────────────────────────────────────────────────────────
const TAG_EMOJIS = {
  work: "💼", job: "💼",
  school: "📚", study: "📚", education: "📚",
  personal: "🏠", home: "🏠",
  health: "💪", gym: "💪", fitness: "💪",
  finance: "💰", money: "💰",
  shopping: "🛒",
  travel: "✈️",
  family: "👨‍👩‍👧",
  food: "🍔",
  dev: "💻", code: "💻", coding: "💻",
};

function tagEmoji(tag) {
  if (!tag) return "";
  return TAG_EMOJIS[tag.toLowerCase()] || "🏷️";
}

// ─── Due date helpers ─────────────────────────────────────────────────────────
function formatDueDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function priorityCell(p) {
  if (p === "high")   return chalk.red.bold("🔴 high");
  if (p === "medium") return chalk.yellow("🟡 med");
  if (p === "low")    return chalk.cyan("🔵 low");
  return chalk.dim("—");
}

// ─── Sort helper ──────────────────────────────────────────────────────────────
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const VALID_SORT_FIELDS = ["priority", "priority-asc", "due", "due-desc"];

function sortTasks(tasks, sortField) {
  const arr = [...tasks];
  if (sortField === "priority") {
    return arr.sort((a, b) =>
      (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3));
  }
  if (sortField === "priority-asc") {
    return arr.sort((a, b) =>
      (PRIORITY_RANK[b.priority] ?? 3) - (PRIORITY_RANK[a.priority] ?? 3));
  }
  if (sortField === "due") {
    return arr.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }
  if (sortField === "due-desc") {
    return arr.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return b.dueDate.localeCompare(a.dueDate);
    });
  }
  return arr.sort((a, b) => a.id - b.id);
}

function dueDateCell(dateStr) {
  if (!dateStr) return chalk.dim("none");
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
  const fmt = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (diffDays < 0) return chalk.red(`🔴 ${fmt}`);
  if (diffDays === 0) return chalk.yellow.bold("⚠️  Today");
  if (diffDays <= 3) return chalk.yellow(fmt);
  return chalk.dim(fmt);
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function clearIfTTY() {
  if (process.stdout.isTTY) console.clear();
}

async function confirm(message) {
  if (!process.stdin.isTTY) return true;
  const { value } = await prompts({ type: "confirm", name: "value", message, initial: true });
  return value === true;
}

// ─── List renderer ────────────────────────────────────────────────────────────
function renderList(data, statusFilter, sortField) {
  const result = listTasks(data, statusFilter);

  if (result.error) {
    console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
    return;
  }

  if (result.tasks.length === 0) {
    if (statusFilter) {
      console.log(`${logSymbols.info} No tasks with status "${chalk.bold(statusFilter)}".`);
    } else {
      console.log(`${logSymbols.info} No tasks yet. Use ${chalk.cyan('tsk add "Your task"')} to create one.`);
    }
  } else {
    // Group tasks by tag
    const groups = new Map();
    for (const task of result.tasks) {
      const key = task.tag || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(task);
    }

    // Sort groups: tagged alphabetically, untagged ("") last
    const sortedKeys = [...groups.keys()].sort((a, b) => {
      if (a === "" && b !== "") return 1;
      if (a !== "" && b === "") return -1;
      return a.localeCompare(b);
    });

    for (const key of sortedKeys) {
      const tasks = sortTasks(groups.get(key), sortField);

      // Print tag section header
      if (key) {
        console.log(`\n  ${chalk.bold.cyan(`${tagEmoji(key)}  ${key.toUpperCase()}`)}`);
      } else {
        console.log(chalk.dim("\n  ─── Other ───"));
      }

      const table = new Table({
        head: [
          chalk.bold("ID"),
          chalk.bold("Priority"),
          chalk.bold("Status"),
          chalk.bold("Title"),
          chalk.bold("Due"),
        ],
        style: { head: ["cyan"], border: ["gray"] },
      });

      for (const task of tasks) {
        const isDone = task.status === "done";
        table.push([
          chalk.bold(String(task.id)),
          priorityCell(task.priority || null),
          isDone ? chalk.green("✓ done") : chalk.yellow("○ todo"),
          isDone ? chalk.dim(task.title) : task.title,
          dueDateCell(task.dueDate),
        ]);
      }

      console.log(table.toString());
    }
  }

  // Stats bar
  const total = data.tasks.length;
  if (total > 0) {
    const completed = data.tasks.filter((t) => t.status === "done").length;
    const pending = total - completed;
    const rate = Math.round((completed / total) * 100);
    const rateStr =
      rate === 100 ? chalk.green.bold(`${rate}% 🏆`) :
      rate >= 80   ? chalk.green(`${rate}%`) :
      rate >= 50   ? chalk.yellow(`${rate}%`) :
                     chalk.red(`${rate}%`);
    console.log(
      `\n  📝 ${chalk.bold("Total:")} ${chalk.white.bold(total)}   ` +
      `✅ ${chalk.bold("Completed:")} ${chalk.green.bold(completed)}   ` +
      `⏳ ${chalk.bold("Pending:")} ${chalk.yellow.bold(pending)}   ` +
      `🎯 ${chalk.bold("Rate:")} ${rateStr}\n`
    );
  }
}

// ─── Program ──────────────────────────────────────────────────────────────────
program
  .name("task-cli")
  .description("A simple CLI task manager for everyday to-do tracking")
  .version("1.0.0")
  .addHelpText("after", `
${chalk.bold("Aliases (shortcuts):")}
  tsk a   →  tsk add
  tsk l   →  tsk list
  tsk d   →  tsk done
  tsk td  →  tsk todo
  tsk del →  tsk delete
  tsk u   →  tsk update
  tsk ud  →  tsk update-due
  tsk clr →  tsk clear
`);

// ─── add ──────────────────────────────────────────────────────────────────────
program
  .command("add")
  .alias("a")
  .description("Add a new task")
  .argument("<title>", "The task title")
  .option("--due <date>",       'Due date, e.g. "march 15", "3/15", "mar 15"')
  .option("--tag <tag>",        "Tag to categorize the task, e.g. work, school, personal")
  .option("-p, --priority <level>", "Priority: high, medium, or low")
  .option("-y, --yes",          "Skip confirmation prompt")
  .action(async (title, options) => {
    const data = loadData();

    let dueDate = null;
    if (options.due) {
      const parsed = parseDueDate(options.due);
      if (parsed.error) {
        console.error(`${logSymbols.error} ${chalk.red(parsed.error)}`);
        process.exit(1);
      }
      dueDate = parsed.dueDate;
    }

    const tag = options.tag ? options.tag.trim().toLowerCase() : null;
    const priority = options.priority ? options.priority.trim().toLowerCase() : null;

    const extras = [];
    if (tag) extras.push(`${tagEmoji(tag)} ${tag}`);
    if (priority) extras.push(priorityCell(priority));
    if (dueDate) extras.push(`due: ${formatDueDateShort(dueDate)}`);
    const extraStr = extras.length ? chalk.dim(` (${extras.join(" · ")})`) : "";

    const ok = options.yes || await confirm(`Add task "${chalk.cyan(title)}"${extraStr}?`);
    if (!ok) { console.log(`${logSymbols.info} Cancelled.`); return; }

    clearIfTTY();
    const result = addTask(data, title, { dueDate, tag, priority });
    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`${logSymbols.success} Task added: ${chalk.bold("#" + result.task.id)} "${chalk.cyan(result.task.title)}"\n`);
    renderList(data);
  });

// ─── list ─────────────────────────────────────────────────────────────────────
program
  .command("list")
  .alias("l")
  .description("List all tasks, grouped by tag")
  .option("--status <status>", "Filter by status: todo or done")
  .option("--sort <field>",   "Sort tasks: priority, priority-asc, due, due-desc")
  .action((options) => {
    if (options.sort && !VALID_SORT_FIELDS.includes(options.sort)) {
      console.error(`${logSymbols.error} ${chalk.red(`Invalid sort field "${options.sort}". Use: ${VALID_SORT_FIELDS.join(", ")}.`)}`);
      process.exit(1);
    }
    clearIfTTY();
    const data = loadData();
    renderList(data, options.status, options.sort);
  });

// ─── done ─────────────────────────────────────────────────────────────────────
program
  .command("done")
  .alias("d")
  .description("Mark a task as completed")
  .argument("<id>", "The task ID")
  .option("--tag <tag>", "Tag to disambiguate when the same ID exists in multiple tags")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (id, options) => {
    const data = loadData();
    const tag = options.tag ? options.tag.trim().toLowerCase() : null;
    const existing = data.tasks.find((t) => t.id === Number(id) && (tag === null || (t.tag || "") === tag));

    if (existing) {
      const ok = options.yes || await confirm(`Mark task #${id} "${chalk.cyan(existing.title)}" as done?`);
      if (!ok) { console.log(`${logSymbols.info} Cancelled.`); return; }
    }

    clearIfTTY();
    const result = markDone(data, id, tag);
    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`${logSymbols.success} Task ${chalk.bold("#" + result.task.id)} marked as done: "${chalk.dim(result.task.title)}"\n`);
    renderList(data);
  });

// ─── todo ─────────────────────────────────────────────────────────────────────
program
  .command("todo")
  .alias("td")
  .description("Mark a done task back to todo")
  .argument("<id>", "The task ID")
  .option("--tag <tag>", "Tag to disambiguate when the same ID exists in multiple tags")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (id, options) => {
    const data = loadData();
    const tag = options.tag ? options.tag.trim().toLowerCase() : null;
    const existing = data.tasks.find((t) => t.id === Number(id) && (tag === null || (t.tag || "") === tag));

    if (existing) {
      const ok = options.yes || await confirm(`Mark task #${id} "${chalk.cyan(existing.title)}" back to todo?`);
      if (!ok) { console.log(`${logSymbols.info} Cancelled.`); return; }
    }

    clearIfTTY();
    const result = markTodo(data, id, tag);
    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`${logSymbols.success} Task ${chalk.bold("#" + result.task.id)} marked as todo: "${chalk.cyan(result.task.title)}"\n`);
    renderList(data);
  });

// ─── delete ───────────────────────────────────────────────────────────────────
program
  .command("delete")
  .alias("del")
  .description("Delete a task")
  .argument("<id>", "The task ID")
  .option("--tag <tag>", "Tag to disambiguate when the same ID exists in multiple tags")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (id, options) => {
    const data = loadData();
    const tag = options.tag ? options.tag.trim().toLowerCase() : null;
    const existing = data.tasks.find((t) => t.id === Number(id) && (tag === null || (t.tag || "") === tag));

    if (existing) {
      const ok = options.yes || await confirm(`🗑️  Delete task #${id} "${chalk.red(existing.title)}"?`);
      if (!ok) { console.log(`${logSymbols.info} Deletion cancelled.`); return; }
    }

    clearIfTTY();
    const result = deleteTask(data, id, tag);
    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`${logSymbols.success} Task ${chalk.bold("#" + result.task.id)} deleted: "${chalk.dim(result.task.title)}"\n`);
    renderList(data);
  });

// ─── update ───────────────────────────────────────────────────────────────────
program
  .command("update")
  .alias("u")
  .description("Update a task's title")
  .argument("<id>", "The task ID")
  .argument("<title>", "The new title")
  .option("--tag <tag>", "Tag to disambiguate when the same ID exists in multiple tags")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (id, title, options) => {
    const data = loadData();
    const tag = options.tag ? options.tag.trim().toLowerCase() : null;
    const existing = data.tasks.find((t) => t.id === Number(id) && (tag === null || (t.tag || "") === tag));

    if (existing) {
      const ok = options.yes || await confirm(`Update task #${id} "${chalk.dim(existing.title)}" → "${chalk.cyan(title)}"?`);
      if (!ok) { console.log(`${logSymbols.info} Cancelled.`); return; }
    }

    clearIfTTY();
    const result = updateTask(data, id, title, tag);
    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`${logSymbols.success} Task ${chalk.bold("#" + result.task.id)} updated: "${chalk.cyan(result.task.title)}"\n`);
    renderList(data);
  });

// ─── update-due ───────────────────────────────────────────────────────────────
program
  .command("update-due")
  .alias("ud")
  .description("Update a task's due date")
  .argument("<id>", "The task ID")
  .argument("<date>", 'New due date, e.g. "march 15", "3/15", "mar 15"')
  .option("--tag <tag>", "Tag to disambiguate when the same ID exists in multiple tags")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (id, date, options) => {
    const data = loadData();
    const tag = options.tag ? options.tag.trim().toLowerCase() : null;

    const parsed = parseDueDate(date);
    if (parsed.error) {
      console.error(`${logSymbols.error} ${chalk.red(parsed.error)}`);
      process.exit(1);
    }

    const existing = data.tasks.find((t) => t.id === Number(id) && (tag === null || (t.tag || "") === tag));
    if (existing) {
      const ok = options.yes || await confirm(`Update due date of task #${id} "${chalk.cyan(existing.title)}" to ${chalk.cyan(formatDueDateShort(parsed.dueDate))}?`);
      if (!ok) { console.log(`${logSymbols.info} Cancelled.`); return; }
    }

    clearIfTTY();
    const result = updateDueDate(data, id, parsed.dueDate, tag);
    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`${logSymbols.success} Task ${chalk.bold("#" + result.task.id)} due date updated: "${chalk.cyan(result.task.title)}" → ${chalk.cyan(formatDueDateShort(result.task.dueDate))}\n`);
    renderList(data);
  });

// ─── clear ────────────────────────────────────────────────────────────────────
program
  .command("clear")
  .alias("clr")
  .description("Delete ALL tasks and start fresh (undoable with tsk undo)")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (options) => {
    const data = loadData();

    if (data.tasks.length === 0) {
      clearIfTTY();
      console.log(`${logSymbols.info} No tasks to clear. The task list is already empty.`);
      return;
    }

    const ok = options.yes || await confirm(
      `🗑️  Delete ALL ${chalk.red.bold(data.tasks.length)} task(s)? This cannot be undone without ${chalk.cyan("tsk undo")}.`
    );
    if (!ok) { console.log(`${logSymbols.info} Cancelled.`); return; }

    clearIfTTY();
    const result = clearAll(data);
    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`${logSymbols.success} Cleared ${chalk.bold(result.count)} task(s). Task list is now empty.\n`);
    renderList(data);
  });

// ─── undo ─────────────────────────────────────────────────────────────────────
program
  .command("undo")
  .description("Undo the last action")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (options) => {
    const data = loadData();

    if (data.undo) {
      const ok = options.yes || await confirm("↩️  Undo last action?");
      if (!ok) { console.log(`${logSymbols.info} Cancelled.`); return; }
    }

    clearIfTTY();
    const result = undoAction(data);
    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`${logSymbols.success} ${chalk.bold("Last action undone.")}\n`);
    renderList(data);
  });

program.parseAsync();
