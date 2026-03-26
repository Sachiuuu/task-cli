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

**Prompts used: 2 / 20**
