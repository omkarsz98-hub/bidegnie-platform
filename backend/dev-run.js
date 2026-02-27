import { spawn, execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const killPortWindows = (port) => {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });

    const pids = new Set();
    output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const parts = line.split(/\s+/);
        const pid = parts[parts.length - 1];
        if (/^\d+$/.test(pid)) {
          pids.add(pid);
        }
      });

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      } catch {
        // Ignore failures for processes that exit before kill.
      }
    }
  } catch {
    // No process is using this port.
  }
};

const run = async () => {
  killPortWindows(5000);
  killPortWindows(5001);

  const mlWorkdir = path.resolve(__dirname, "../ml-service");
  const backendWorkdir = __dirname;

  const mlProc = spawn("python", ["app.py"], {
    cwd: mlWorkdir,
    stdio: "inherit",
    shell: true
  });

  const cleanup = () => {
    if (!mlProc.killed) {
      mlProc.kill();
    }
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const backendProc = spawn("node", ["src/server.js"], {
    cwd: backendWorkdir,
    stdio: "inherit",
    shell: true
  });

  backendProc.on("exit", (code) => {
    cleanup();
    process.exit(code ?? 0);
  });
};

run();
