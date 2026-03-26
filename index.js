#!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const logSymbols = require("log-symbols");
const Table = require("cli-table3");
const prompts = require("prompts");
const { loadData, saveData } = require("./src/storage");
const {
  addTask, listTasks, markDone, markTodo, deleteTask, updateTask, undoAction, parseDueDate,
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

function dueDateCell(dateStr) {
  if (!dateStr) return "";
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
function renderList(data, statusFilter) {
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
    // Sort: tagged tasks first (alphabetically by tag), untagged last
    const sorted = [...result.tasks].sort((a, b) => {
      if (a.tag === b.tag) return 0;
      if (!a.tag) return 1;
      if (!b.tag) return -1;
      return a.tag.localeCompare(b.tag);
    });

    const anyTagged = sorted.some((t) => t.tag);

    const table = new Table({
      head: [
        chalk.bold("ID"),
        chalk.bold("Status"),
        chalk.bold("Tag"),
        chalk.bold("Title"),
        chalk.bold("Due"),
      ],
      style: { head: ["cyan"], border: ["gray"] },
    });

    let currentTag = Symbol("init");

    for (const task of sorted) {
      const taskTag = task.tag || null;

      // Insert section header when tag group changes
      if (anyTagged && taskTag !== currentTag) {
        currentTag = taskTag;
        const header = taskTag
          ? chalk.bold.cyan(`  ${tagEmoji(taskTag)}  ${taskTag.toUpperCase()}`)
          : chalk.dim("  ─── Other ───");
        table.push([{ content: header, colSpan: 5 }]);
      }

      const isDone = task.status === "done";
      table.push([
        chalk.bold(String(task.id)),
        isDone ? chalk.green("✓ done") : chalk.yellow("○ todo"),
        task.tag ? `${tagEmoji(task.tag)} ${task.tag}` : "",
        isDone ? chalk.dim(task.title) : task.title,
        dueDateCell(task.dueDate),
      ]);
    }

    console.log(table.toString());
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
`);

// ─── add ──────────────────────────────────────────────────────────────────────
program
  .command("add")
  .alias("a")
  .description("Add a new task")
  .argument("<title>", "The task title")
  .option("--due <date>", 'Due date, e.g. "march 15", "3/15", "mar 15"')
  .option("--tag <tag>",  "Tag to categorize the task, e.g. work, school, personal")
  .option("-y, --yes",    "Skip confirmation prompt")
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

    const extras = [];
    if (tag) extras.push(`${tagEmoji(tag)} ${tag}`);
    if (dueDate) extras.push(`due: ${formatDueDateShort(dueDate)}`);
    const extraStr = extras.length ? chalk.dim(` (${extras.join(" · ")})`) : "";

    const ok = options.yes || await confirm(`Add task "${chalk.cyan(title)}"${extraStr}?`);
    if (!ok) { console.log(`${logSymbols.info} Cancelled.`); return; }

    clearIfTTY();
    const result = addTask(data, title, { dueDate, tag });
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
  .description("List all tasks")
  .option("--status <status>", "Filter by status: todo or done")
  .action((options) => {
    clearIfTTY();
    const data = loadData();
    renderList(data, options.status);
  });

// ─── done ─────────────────────────────────────────────────────────────────────
program
  .command("done")
  .alias("d")
  .description("Mark a task as completed")
  .argument("<id>", "The task ID")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (id, options) => {
    const data = loadData();
    const existing = data.tasks.find((t) => t.id === Number(id));

    if (existing) {
      const ok = options.yes || await confirm(`Mark task #${id} "${chalk.cyan(existing.title)}" as done?`);
      if (!ok) { console.log(`${logSymbols.info} Cancelled.`); return; }
    }

    clearIfTTY();
    const result = markDone(data, id);
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
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (id, options) => {
    const data = loadData();
    const existing = data.tasks.find((t) => t.id === Number(id));

    if (existing) {
      const ok = options.yes || await confirm(`Mark task #${id} "${chalk.cyan(existing.title)}" back to todo?`);
      if (!ok) { console.log(`${logSymbols.info} Cancelled.`); return; }
    }

    clearIfTTY();
    const result = markTodo(data, id);
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
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (id, options) => {
    const data = loadData();
    const existing = data.tasks.find((t) => t.id === Number(id));

    if (existing) {
      const ok = options.yes || await confirm(`🗑️  Delete task #${id} "${chalk.red(existing.title)}"?`);
      if (!ok) { console.log(`${logSymbols.info} Deletion cancelled.`); return; }
    }

    clearIfTTY();
    const result = deleteTask(data, id);
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
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (id, title, options) => {
    const data = loadData();
    const existing = data.tasks.find((t) => t.id === Number(id));

    if (existing) {
      const ok = options.yes || await confirm(`Update task #${id} "${chalk.dim(existing.title)}" → "${chalk.cyan(title)}"?`);
      if (!ok) { console.log(`${logSymbols.info} Cancelled.`); return; }
    }

    clearIfTTY();
    const result = updateTask(data, id, title);
    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`${logSymbols.success} Task ${chalk.bold("#" + result.task.id)} updated: "${chalk.cyan(result.task.title)}"\n`);
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
