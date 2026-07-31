import { spawn } from "node:child_process";

const run = (name, command, args) => {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    shell: true,
    stdio: "pipe",
  });

  child.stdout.on("data", (data) => process.stdout.write(`[${name}] ${data}`));
  child.stderr.on("data", (data) => process.stderr.write(`[${name}] ${data}`));
  child.on("exit", (code) => {
    if (code) console.error(`[${name}] exited with code ${code}`);
  });

  return child;
};

const backend = run("backend", "npm", ["run", "dev:backend"]);
const frontend = run("frontend", "npm", ["run", "dev:frontend"]);

const shutdown = () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
