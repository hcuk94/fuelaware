import { spawn } from "node:child_process";
import { runMigrations } from "./run-migrations.mjs";

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    throw new Error("A command is required after start-with-migrations.mjs");
  }

  runMigrations();

  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
