#!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const logSymbols = require("log-symbols");
const Table = require("cli-table3");
const prompts = require("prompts");
const { loadData, saveData } = require("./src/storage");
const { addTask, listTasks, markDone, deleteTask, updateTask } = require("./src/task");

program
  .name("task-cli")
  .description("A simple CLI task manager for everyday to-do tracking")
  .version("1.0.0");

program
  .command("add")
  .description("Add a new task")
  .argument("<title>", "The task title")
  .action((title) => {
    const data = loadData();
    const result = addTask(data, title);

    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`${logSymbols.success} Task added: ${chalk.bold("#" + result.task.id)} "${chalk.cyan(result.task.title)}"`);
  });

program
  .command("list")
  .description("List all tasks")
  .option("--status <status>", "Filter by status (todo or done)")
  .action((options) => {
    const data = loadData();
    const result = listTasks(data, options.status);

    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    if (result.tasks.length === 0) {
      if (options.status) {
        console.log(`${logSymbols.info} No tasks with status "${chalk.bold(options.status)}".`);
      } else {
        console.log(`${logSymbols.info} No tasks yet. Use ${chalk.cyan('task-cli add "Your task"')} to create one.`);
      }
      return;
    }

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
    console.log(chalk.dim(`  ${result.tasks.length} task(s) total`));
  });

program
  .command("done")
  .description("Mark a task as completed")
  .argument("<id>", "The task ID")
  .action((id) => {
    const data = loadData();
    const result = markDone(data, id);

    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`${logSymbols.success} Task ${chalk.bold("#" + result.task.id)} marked as done: "${chalk.dim(result.task.title)}"`);
  });

program
  .command("delete")
  .description("Delete a task")
  .argument("<id>", "The task ID")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (id, options) => {
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
    console.log(`${logSymbols.success} Task ${chalk.bold("#" + result.task.id)} deleted: "${chalk.dim(result.task.title)}"`);
  });

program
  .command("update")
  .description("Update a task's title")
  .argument("<id>", "The task ID")
  .argument("<title>", "The new title")
  .action((id, title) => {
    const data = loadData();
    const result = updateTask(data, id, title);

    if (result.error) {
      console.error(`${logSymbols.error} ${chalk.red(result.error)}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`${logSymbols.success} Task ${chalk.bold("#" + result.task.id)} updated: "${chalk.cyan(result.task.title)}"`);
  });

program.parseAsync();
