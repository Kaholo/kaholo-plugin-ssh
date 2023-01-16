const path = require("path");
const { access, lstat } = require("fs/promises");
const { constants: { F_OK } } = require("fs");

async function assertPath(value) {
  try {
    await access(value, F_OK);
  } catch {
    throw new Error(`Path ${value} does not exist!`);
  }
}

function handleChildProcess(childProcessInstance, options) {
  const stdoutChunks = [];
  const stderrChunks = [];

  childProcessInstance.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
  childProcessInstance.stderr.on("data", (chunk) => stderrChunks.push(chunk));

  return new Promise((res, rej) => {
    childProcessInstance.on(options?.exitSignal || "exit", (exitCode) => {
      const output = {
        stderr: stderrChunks.join("\n"),
        stdout: stdoutChunks.join("\n"),
        code: exitCode,
      };

      if (options?.verifyExitCode && exitCode !== 0) {
        return rej(new Error(`Execution finished with an error\n\n${JSON.stringify(output, null, 2)}`));
      }
      return res(output);
    });

    childProcessInstance.on("error", rej);
  });
}

function handleCommandOutput(commandOutput) {
  if (commandOutput.stderr && !commandOutput.stdout) {
    throw new Error(commandOutput.stderr);
  } else if (commandOutput.stderr) {
    console.error(commandOutput.stderr);
  }

  return commandOutput.stdout;
}

async function safeStat(localPath) {
  let stat = {};
  try {
    stat = await lstat(localPath);
    Object.defineProperty(stat, "exists", {
      value: true,
    });
  } catch {
    stat = { exists: false };
  }

  return stat;
}

async function isPathFile(value) {
  const pathStat = await safeStat(value);
  return pathStat.exists && pathStat.isFile();
}

async function resolveTargetPath(params) {
  const {
    getSafeStat,
    sourcePath,
    targetPath,
    altBasename,
  } = params;

  let resolvedTargetPath = targetPath || "./";
  const sourcePathStat = await getSafeStat(resolvedTargetPath);
  if (sourcePathStat.exists && sourcePathStat.isDirectory()) {
    resolvedTargetPath = path.join(resolvedTargetPath, altBasename || path.basename(sourcePath));
  }

  return resolvedTargetPath;
}

module.exports = {
  assertPath,
  safeStat,
  handleChildProcess,
  handleCommandOutput,
  isPathFile,
  resolveTargetPath,
};
