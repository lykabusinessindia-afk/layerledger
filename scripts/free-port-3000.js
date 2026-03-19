const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");

const PORT = 3000;
const NEXT_DEV_LOCK = path.join(process.cwd(), ".next", "dev", "lock");

function cleanupNextDevLock() {
  try {
    if (fs.existsSync(NEXT_DEV_LOCK)) {
      fs.unlinkSync(NEXT_DEV_LOCK);
      console.log("[dev] Removed stale .next/dev/lock file.");
    }
  } catch {
    console.error("[dev] Could not remove .next/dev/lock. Please remove it manually.");
  }
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

function killPortOnWindows(port) {
  let output = "";
  try {
    output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
  } catch {
    return false;
  }

  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const pids = Array.from(
    new Set(
      lines
        .filter((line) => /LISTENING/i.test(line))
        .map((line) => line.split(/\s+/).pop())
        .filter((pid) => pid && /^\d+$/.test(pid))
    )
  );

  if (pids.length === 0) return false;

  let killedAny = false;
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      console.log(`[dev] Port ${port} was busy. Killed process PID ${pid}.`);
      killedAny = true;
    } catch {
      console.error(`[dev] Port ${port} is busy (PID ${pid}) and could not be killed automatically.`);
    }
  }

  return killedAny;
}

function killPortOnUnix(port) {
  try {
    const pid = execSync(`lsof -ti tcp:${port}`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    })
      .trim()
      .split(/\r?\n/)[0];

    if (!pid) return false;

    execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    console.log(`[dev] Port ${port} was busy. Killed process PID ${pid}.`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  cleanupNextDevLock();

  if (await isPortFree(PORT)) {
    console.log(`[dev] Port ${PORT} is free.`);
    return;
  }

  const killed = process.platform === "win32" ? killPortOnWindows(PORT) : killPortOnUnix(PORT);

  const freeAfterKill = await isPortFree(PORT);
  if (!killed || !freeAfterKill) {
    console.error(`[dev] Port ${PORT} is still busy. Please close the blocking process manually.`);
    process.exit(1);
  }

  console.log(`[dev] Port ${PORT} is now free.`);
}

main().catch(() => {
  console.error(`[dev] Failed to prepare port ${PORT}.`);
  process.exit(1);
});
