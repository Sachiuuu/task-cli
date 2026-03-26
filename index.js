#!/usr/bin/env node

const { program } = require("commander");
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
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`Task added: #${result.task.id} "${result.task.title}"`);
  });

program
  .command("list")
  .description("List all tasks")
  .option("--status <status>", "Filter by status (todo or done)")
  .action((options) => {
    const data = loadData();
    const result = listTasks(data, options.status);

    if (result.error) {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

    if (result.tasks.length === 0) {
      if (options.status) {
        console.log(`No tasks with status "${options.status}".`);
      } else {
        console.log("No tasks yet. Use 'task-cli add \"Your task\"' to create one.");
      }
      return;
    }

    console.log("");
    console.log("  ID  | Status | Title");
    console.log("  ----|--------|------");
    for (const task of result.tasks) {
      const status = task.status === "done" ? "done " : "todo ";
      const id = String(task.id).padStart(3, " ");
      console.log(`  ${id} | ${status}  | ${task.title}`);
    }
    console.log("");
    console.log(`  Total: ${result.tasks.length} task(s)`);
    console.log("");
  });

program
  .command("done")
  .description("Mark a task as completed")
  .argument("<id>", "The task ID")
  .action((id) => {
    const data = loadData();
    const result = markDone(data, id);

    if (result.error) {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`Task #${result.task.id} marked as done: "${result.task.title}"`);
  });

program
  .command("delete")
  .description("Delete a task")
  .argument("<id>", "The task ID")
  .action((id) => {
    const data = loadData();
    const result = deleteTask(data, id);

    if (result.error) {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`Task #${result.task.id} deleted: "${result.task.title}"`);
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
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

    saveData(data);
    console.log(`Task #${result.task.id} updated: "${result.task.title}"`);
  });

program.parse();
