#!/usr/bin/env node
/**
 * `pnpm lab` — Node deps (if needed) + `.venv` + pip (jupyterlab) + Jupyter Lab.
 * `--install-only` — Node deps only (no Python).
 * `--prepare` / `--deps-only` — Node + `.venv` + pip; no Jupyter (see `pnpm lab:deps`).
 */
import { spawnSync } from "node:child_process";
import { existsSync, rmSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const notebooksDir = join(root, "notebooks");
const requirementsLab = join(root, "requirements-lab.txt");
const isWin = process.platform === "win32";

const venvDir = join(root, ".venv");
const venvPython = isWin
  ? join(venvDir, "Scripts", "python.exe")
  : join(venvDir, "bin", "python3");
const venvPythonAlt = join(venvDir, "bin", "python");

const run = (cmd, args, options = {}) => {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: options.env ?? process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run(
  process.execPath,
  [join(root, "scripts", "lab-install.mjs"), "--if-needed"],
  {
    env: { ...process.env, DUNGEONBREAK_SKIP_KAPLAY_GAME: "1" },
  }
);

const nodeOnly = process.argv.includes("--install-only");
const prepareOnly =
  process.argv.includes("--prepare") || process.argv.includes("--deps-only");

if (nodeOnly && !prepareOnly) {
  console.log("Done (--install-only). Run `pnpm lab` for Jupyter Lab.");
  process.exit(0);
}

if (!existsSync(notebooksDir)) {
  console.error(`Missing ${notebooksDir}`);
  process.exit(1);
}

if (!existsSync(requirementsLab)) {
  console.error(`Missing ${requirementsLab}`);
  process.exit(1);
}

function resolveVenvPython() {
  if (existsSync(venvPython)) {
    return venvPython;
  }
  if (existsSync(venvPythonAlt)) {
    return venvPythonAlt;
  }
  return null;
}

function venvHasPip(py) {
  const r = spawnSync(py, ["-m", "pip", "--version"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  return r.status === 0;
}

const venvCreateAttempts = isWin
  ? [
      ["py", ["-3", "-m", "venv", ".venv", "--upgrade-deps"]],
      ["py", ["-3", "-m", "venv", ".venv"]],
      ["python", ["-m", "venv", ".venv", "--upgrade-deps"]],
      ["python", ["-m", "venv", ".venv"]],
      ["python3", ["-m", "venv", ".venv", "--upgrade-deps"]],
      ["python3", ["-m", "venv", ".venv"]],
    ]
  : [
      ["python3", ["-m", "venv", ".venv", "--upgrade-deps"]],
      ["python3", ["-m", "venv", ".venv"]],
      ["python", ["-m", "venv", ".venv", "--upgrade-deps"]],
      ["python", ["-m", "venv", ".venv"]],
    ];

function createVenv() {
  console.log("Creating Python virtual environment at .venv …");
  for (const [cmd, args] of venvCreateAttempts) {
    const r = spawnSync(cmd, args, {
      cwd: root,
      stdio: "inherit",
      shell: false,
    });
    if (r.error?.code === "ENOENT") {
      continue;
    }
    if (r.status === 0) {
      const py = resolveVenvPython();
      if (py) {
        return py;
      }
    }
  }
  return null;
}

function removeVenv() {
  if (!existsSync(venvDir)) {
    return;
  }
  console.log("Removing broken .venv …");
  try {
    rmSync(venvDir, { recursive: true, force: true });
  } catch {
    console.error(
      "Could not delete .venv (in use?). Close terminals/IDE using it, delete .venv manually, then pnpm lab."
    );
    process.exit(1);
  }
}

function ensureVenv() {
  let py = resolveVenvPython();
  if (!py) {
    py = createVenv();
    if (!py) {
      console.error(
        "Could not create .venv. Install Python 3.10+ from python.org (enable pip) so `py -3` or `python` works."
      );
      process.exit(1);
    }
  }
  return py;
}

function ensurePip(pythonExe) {
  if (venvHasPip(pythonExe)) {
    return pythonExe;
  }
  console.log("Bootstrapping pip in .venv (ensurepip) …");
  spawnSync(pythonExe, ["-m", "ensurepip", "--upgrade", "--default-pip"], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (venvHasPip(pythonExe)) {
    return pythonExe;
  }
  spawnSync(pythonExe, ["-m", "ensurepip", "--default-pip"], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (venvHasPip(pythonExe)) {
    return pythonExe;
  }
  removeVenv();
  let py = createVenv();
  if (py && !venvHasPip(py)) {
    const getPipPath = join(root, "get-pip.py");
    const dl = `import urllib.request; urllib.request.urlretrieve("https://bootstrap.pypa.io/get-pip.py", ${JSON.stringify(getPipPath)})`;
    const downloaders = isWin
      ? [
          ["py", ["-3", "-c", dl]],
          ["python", ["-c", dl]],
        ]
      : [
          ["python3", ["-c", dl]],
          ["python", ["-c", dl]],
        ];
    console.log("Installing pip via get-pip.py …");
    for (const [cmd, args] of downloaders) {
      const dr = spawnSync(cmd, args, {
        cwd: root,
        stdio: "pipe",
        shell: false,
      });
      if (dr.status === 0 && existsSync(getPipPath)) {
        break;
      }
    }
    if (existsSync(getPipPath)) {
      spawnSync(py, [getPipPath], {
        cwd: root,
        stdio: "inherit",
        shell: false,
      });
      try {
        unlinkSync(getPipPath);
      } catch {
        /* ignore */
      }
    }
  }
  py = resolveVenvPython();
  if (!(py && venvHasPip(py))) {
    console.error(
      "pip is still missing. Delete .venv, reinstall Python from python.org (include pip), then: pnpm lab"
    );
    process.exit(1);
  }
  return py;
}

function ensureJupyterDeps(pythonExe) {
  console.log(
    "Installing / updating lab Python deps (jupyterlab, ipykernel) …"
  );
  run(pythonExe, ["-m", "pip", "install", "-q", "--upgrade", "pip"]);
  run(pythonExe, ["-m", "pip", "install", "-q", "-r", requirementsLab]);
}

let pythonExe = ensureVenv();
pythonExe = ensurePip(pythonExe);
ensureJupyterDeps(pythonExe);

if (prepareOnly) {
  console.log(
    "Lab Python env ready (.venv). Run `pnpm lab` to start Jupyter Lab."
  );
  process.exit(0);
}

console.log("Starting Jupyter Lab (notebooks/) …");
const r = spawnSync(
  pythonExe,
  ["-m", "jupyter", "lab", "--notebook-dir", notebooksDir],
  {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      VIRTUAL_ENV: venvDir,
      PATH: isWin
        ? `${join(venvDir, "Scripts")};${process.env.PATH ?? ""}`
        : `${join(venvDir, "bin")}:${process.env.PATH ?? ""}`,
    },
  }
);
process.exit(r.status === null ? 1 : r.status);
