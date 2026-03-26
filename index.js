#!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const logSymbols = require("log-symbols");
const Table = require("cli-table3");
const prompts = require("prompts");
const { loadData, saveData } = require("./src/storage");
const { addTask, listTasks, markDone, deleteTask, updateTask, undoAction } = require("./src/task");

function clearIfTTY() {
  if (process.stdout.isTTY) console.clear();
}

async function confirm(message) {
  if (!process.stdin.isTTY) return true;
  const { value } = await prompts({ type: "confirm", name: "value", message, initial: true });
  return value === true;
}

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
    const table = new Table({
      head: [chalk.bold("ID"), chalk.bold("Status"), chalk.bold("Title"), chalk.bold("Created")],
      style: { head: ["cyan"], border: ["gray"] },
    });

    for (const task of result.tasks) {
      const isDone = task.status === "done";
      const status = isDone ? chalk.green("✓ done") : chalk.yellow("○ todo");
      const title = isDone ? chalk.dim(task.title) : task.title;
      const created = new Date(task.createdAt).toLocaleDateString();
      table.push([chalk.bold(String(task.id)), status, title, created]);
    }

    console.log(table.toString());
  }

  const total = data.tasks.length;
  if (total > 0) {
    const completed = data.tasks.filter((t) => t.status === "done").length;
    const pending = total - completed;
    const rate = Math.round((completed / total) * 100);
    const rateStr = rate === 100 ? chalk.green.bold(`${rate}% 🏆`) :
                    rate >= 80  ? chalk.green(`${rate}%`) :
                    rate >= 50  ? chalk.yellow(`${rate}%`) :
                                  chalk.red(`${rate}%`);
    console.log(
      `\n  📝 ${chalk.bold("Total:")} ${chalk.white.bold(total)}   ` +
      `✅ ${chalk.bold("Completed:")} ${chalk.green.bold(completed)}   ` +
      `⏳ ${chalk.bold("Pending:")} ${chalk.yellow.bold(pending)}   ` +
      `🎯 ${chalk.bold("Rate:")} ${rateStr}\n`
    );
  }
}

program
  .name("task-cli")
  .description("A simple CLI task manager for everyday to-do tracking")
  .version("1.0.0")
  .addHelpText("after", `
${chalk.bold("Aliases (shortcuts):")}
  tsk a   →  tsk add
  tsk l   →  tsk list
  tsk d   →  tsk done
  tsk del →  tsk delete
  tsk u   →  tsk update
`);

program
  .command("add")
  .alias("a")
  .description("Add a new task")
  .argument("<title>", "The task title")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (title, options) => {
    const data = loadData();

    const ok = options.yes || await confirm(`Add task "${chalk.cyan(title)}"?`);
    if (!ok) { console.log(`${logSymbols.info} Cancelled.`); return; }

    clearIfTTY();
    const result = addTask(data, title);
    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`${logSymbols.success} Task added: ${chalk.bold("#" + result.task.id)} "${chalk.cyan(result.task.title)}"\n`);
    renderList(data);
  });

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

program
  .command("done")
  .alias("d")
  .description("Mark a task as completed")
  .argument("<id>", "The task ID")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (id, options) => {
    const data = loadData();
    const numId = Number(id);
    const existingTask = data.tasks.find((t) => t.id === numId);

    if (existingTask) {
      const ok = options.yes || await confirm(`Mark task #${id} "${chalk.cyan(existingTask.title)}" as done?`);
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

program
  .command("delete")
  .alias("del")
  .description("Delete a task")
  .argument("<id>", "The task ID")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (id, options) => {
    const data = loadData();
    const numId = Number(id);
    const existingTask = data.tasks.find((t) => t.id === numId);

    if (existingTask) {
      const ok = options.yes || await confirm(`🗑️  Delete task #${id} "${chalk.red(existingTask.title)}"?`);
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

program
  .command("update")
  .alias("u")
  .description("Update a task's title")
  .argument("<id>", "The task ID")
  .argument("<title>", "The new title")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (id, title, options) => {
    const data = loadData();
    const numId = Number(id);
    const existingTask = data.tasks.find((t) => t.id === numId);

    if (existingTask) {
      const ok = options.yes || await confirm(`Update task #${id} "${chalk.dim(existingTask.title)}" → "${chalk.cyan(title)}"?`);
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
