# Prompts History

This document logs all prompts used during the development of task-cli.

---

## Prompt 1 (Planning + Full Implementation)

**Prompt:**

> Me gustaria crear un CLI en el cual pueda gestionar tareas de mi dia a dia a traves de comandos, algo como un task manager. Este proyecto tiene ciertos requerimientos los cuales tienen que cumplirse, los cuales son:
> 1. Debe funcionar desde la terminal, guardar las tareas entre sesiones, y ser facil de usar para alguien no tecnico.
> 2. Cualquier persona puede instalar y utilizar la herramienta sin ninguna complicacion, siguiendo un README file para conseguir la instalacion de manera exitosa.
> 3. Los datos del usuario deben de persistir en todo momento, caso como cerrando la terminal, abro o cambio de terminal.
> 4. Se debe de manejar un buen UserInputValidation para evitar cualquier crash por inputs sin sentido o inesperados (se debe de informar al usuario con un FriendlyMsg).
> 5. La herramienta debe de ser testeada para evitar problemas dando el producto final, aumentando la calidad de la herramienta. Ejemplo de algunos tests: Creacion, Listado y eliminacion de tareas; integridad de datos, persistencia/guardado de datos en el sistema correctamente, etc.
> 6. Mostrar el Story Development de el CLI mediante un git history, contando q cambios, q cambia y una breve descripcion a travez de commits. NO HACER SOLO UN COMMIT AL FINAL.
> 7. Tener un DECISIONS.md con las 3 decisiones mas importantes del diseno, incluyendo sus contras/tradeoffs.
> 8. Quiero q guardes todos los prompts q se usaran en la creacion de esta herramienta en un file llamado PROMPTS.md, ya que se requiere el historial de estos, incluyendo q tengo un maximo de 20 prompts para crear la herramienta.
> Dado todos los requirements, me gustaria que hagas un plan detallado en el cual prioritize la calidad sobre cantidad del CLI y el cual sea eficiente en recursos como prompts que debere de utilizar.

**What was done:**
- Created a detailed implementation plan
- Set up project configuration (.gitignore, package.json with bin field and test script)
- Implemented `src/storage.js` — JSON file persistence with corruption recovery
- Implemented `src/task.js` — CRUD operations with full input validation
- Implemented `index.js` — CLI entry point with all 5 commands (add, list, done, delete, update)
- Created 45 tests across 3 test suites (storage, task logic, CLI integration)
- All tests passing
- Created README.md, DECISIONS.md, and PROMPTS.md

**Git commits produced:**
1. `Set up project configuration and .gitignore`
2. `Add storage module for JSON file persistence`
3. `Add task module with CRUD operations and input validation`
4. `Add CLI entry point with all commands`
5. `Add comprehensive tests for storage, tasks, and CLI integration`
6. `Add README, DECISIONS.md, and PROMPTS.md`

---

## Prompt 2 (ID Renumbering + New Libraries)

**Prompt:**

> Ya probe el CLI y por el momento todo bien, lo unico que tocaria configurar seria el id de las tareas cuando se eliminan, me explico, tengo tres tareas y cada una tiene su respectivo id, al eliminar por ejemplo el id #1 y despues llamar el comando task-cli list se puede ver el id #2 y #3, cuando estos se deberian actualizar y restar uno pasando de 2 -> 1 y el 3 -> 2. Tambien me gustaria agregar las siguientes librerias para personalizar mas el CLI y q el usuario se sineta mas comodo. Chalk para los colores, log-symbols para un feedback mas claro y ayudar a usuarios de entrada, cli-table3 para mejorar el listado de tareas y prompts para una mejor interaccion consola a usuario y usuario consola.

**What was done:**
- Updated `src/task.js`: `deleteTask` now renumbers remaining tasks sequentially from 1 after any deletion
- Installed chalk@4, log-symbols@4, cli-table3, prompts (CJS-compatible versions)
- Updated `index.js` with full UI overhaul: colored output, ✔/✖/ℹ symbols, table-based list, delete confirmation prompt
- Updated `tests/task.test.js` to reflect new renumbering behavior
- Updated `DECISIONS.md` decision #2 to reflect the renumbering approach
- All 45 tests still passing

**Git commits produced:**
7. `Renumber task IDs sequentially after deletion`
8. `Add chalk, log-symbols, cli-table3, prompts for improved UX`

---

## Prompt 3 (Undo, Stats, Aliases, Screen Clear)

**Prompt:**

> me gustaria mejorar y agregar ciertas cosas a task-cli. Lo primero es agregar un undo feature el cual el usuario pueda volver hacia atras evitando algun error. Al momento de llamar el list command, mostrarle al usuario los stats de el numero total de sus tareas, como el Total, Completed, pending/todo and completion rate. por ultimo agregar aliases o shortcuts para esos usuarios q quieren eficiencia al usar la herramienta, en vez de task-cli add "smth" -> t a "smth". Tmb me gustaria q cada vez q al inicio de cada comando se haga un re-render completo de la lista utilizando console.clear() para asi no sobrestimular al usuario con informacion previa o confundirlos al utilizar la herramienta.

**What was done:**
- Added snapshot-based undo to `src/task.js` — saves state before add, done, delete, update
- Added `undoAction()` function — restores previous snapshot (single level)
- Added `undo: null` to data model in `src/storage.js` with backward-compat for old files
- Updated `index.js` with: undo command, stats bar, command aliases, console.clear() (TTY only), auto re-render list after mutations
- Added `"t": "./index.js"` bin alias in `package.json`
- Added 6 undo tests in `task.test.js`, 3 undo integration tests in `cli.test.js`
- All 55 tests passing

**Git commits produced:**
9. `Add undo feature with snapshot-based state restore`
10. `Add undo field to data model with backward-compat loading`
11. `Add stats, undo command, aliases, and screen clear on each command`

---

## Prompt 4 (Binary rename, confirmations, stats emojis, aliases in help)

**Prompt:**

> el binario t no es identificado por la terminal, podriamos cambiarlo a ts o tsk, tambien en el help command haz un output de los aliases junto su version original. el screen clear esta bien pero al eliminar haz el clear despues de q el usuario confirme su eleccion. tambien agrega un mensaje de confirmacion al agregar un task, update task, done task, y undo action para q el usuario no tenga ninguna equivocacion. Los stats pueden tener un color y emojis para q sea mas informativo y el usuario este mejor informado.

**What was done:**
- Renamed binary alias from `t` to `tsk` in `package.json`
- Added confirmation prompts for add, done, update, undo (delete already had one)
- Moved `clearIfTTY()` to run AFTER user confirms in all commands with prompts
- Updated stats bar with emojis (📝 Total, ✅ Completed, ⏳ Pending, 🎯 Rate)
- Rate is color-coded: green (>=80%), yellow (>=50%), red (<50%), 🏆 at 100%
- Help output shows `add|a`, `list|l` etc. inline + custom Aliases shortcuts section
- Added `-y/--yes` flag to all commands with confirmations
- All 55 tests still passing

**Git commits produced:**
13. `Rename binary alias from 't' to 'tsk' to avoid terminal conflicts`
14. `Add confirmations, colored stats with emojis, aliases in help`

---

## Prompt 5 (todo command, due dates, tags, git history clean)

**Prompt:**

> el alias 'tsk' no es reconocido como un comando interno u/o externo. Me gustaria agregar otro comando llamado "todo" el cual es lo contrario a done, colocara una tarea q el status sea done a todo. Tambien me gustaria anadir un due date para los tasks, el input del usuario solo requerira nombre/numero de mes + el dia, el ano se tomara automaticamente. Implementar una opcion al crear un task el cual permita colocar un tag, dividiendo las tareas en diferentes areas como: school, work, etc, tomando en cuenta el tag agregar un emoji q ilustre el tag; y separar estos tags en la tabla tambien. Anadiendo a eso me gustaria si es posible q en el commit history del git repository solo este mi nombre en todos los commits pasados y futuros.

**What was done:**
- Fixed tsk alias by re-running `npm link`
- Added `markTodo(data, id)` to task.js — opposite of markDone
- Added `parseDueDate(input)` — parses "march 15", "3/15", "mar 15", "dec 31", etc. Year auto-set (next year if date already passed)
- Updated `addTask()` to accept `{ dueDate, tag }` options
- Updated `index.js`: todo command (alias td), --due and --tag options on add, table now has Tag+Due columns, tasks grouped by tag with emoji headers
- 77 tests passing (added 22 new tests)
- Removed Co-Authored-By from all past commits using `git filter-branch`
- Future commits will only have the author's name

**Git commits produced:**
16. `Add todo command, due dates, tags, and parseDueDate`
17. `Add todo command, --due/--tag options, tag grouping in list`

---

**Prompts used: 5 / 20**
