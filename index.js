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
      console.log(`${logSymbols.info} No tasks yet. Use ${chalk.cyan('task-cli add "Your task"')} to create one.`);
    }
  } else {
    const table = new Table({
      head: [
        chalk.bold("ID"),
        chalk.bold("Status"),
        chalk.bold("Title"),
        chalk.bold("Created"),
      ],
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

  // Stats bar (always calculated from all tasks, not filtered view)
  const total = data.tasks.length;
  if (total > 0) {
    const completed = data.tasks.filter((t) => t.status === "done").length;
    const pending = total - completed;
    const rate = Math.round((completed / total) * 100);
    console.log(
      `\n  ${chalk.bold("Total:")} ${total}  ${chalk.gray("│")}  ` +
      `${chalk.bold("Completed:")} ${chalk.green(completed)}  ${chalk.gray("│")}  ` +
      `${chalk.bold("Pending:")} ${chalk.yellow(pending)}  ${chalk.gray("│")}  ` +
      `${chalk.bold("Rate:")} ${rate}%\n`
    );
  }
}

program
  .name("task-cli")
  .description("A simple CLI task manager for everyday to-do tracking")
  .version("1.0.0");

program
  .command("add")
  .alias("a")
  .description("Add a new task")
  .argument("<title>", "The task title")
  .action((title) => {
    clearIfTTY();
    const data = loadData();
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
  .option("--status <status>", "Filter by status (todo or done)")
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
  .action((id) => {
    clearIfTTY();
    const data = loadData();
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
    clearIfTTY();
    const data = loadData();

    if (process.stdin.isTTY && !options.yes) {
      const numId = Number(id);
      const existingTask = data.tasks.find((t) => t.id === numId);

      if (existingTask) {
        const response = await prompts({
          type: "confirm",
          name: "value",
          message: `Delete task #${id} "${existingTask.title}"?`,
          initial: false,
        });

        if (!response.value) {
          console.log(`${logSymbols.info} Deletion cancelled.`);
          return;
        }
      }
    }

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
  .action((id, title) => {
    clearIfTTY();
    const data = loadData();
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
  .action(() => {
    clearIfTTY();
    const data = loadData();
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
