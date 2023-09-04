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

  childProcessInstance.stdout.on("data", (chunk) => {
    stdoutChunks.push(chunk);
    process.stdout.write(chunk ?? "");
  });
  childProcessInstance.stderr.on("data", (chunk) => {
    stderrChunks.push(chunk);
    process.stderr.write(chunk ?? "");
  });

  return new Promise((res, rej) => {
    childProcessInstance.on(options?.exitSignal || "exit", (exitCode) => {
      const output = {
        stderr: stderrChunks,
        stdout: stdoutChunks,
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
    throw new Error(commandOutput.stderr.join("\n"));
  } else if (commandOutput.stderr) {
    console.error(commandOutput.stderr.join("\n"));
  }

  const jsonChunks = commandOutput.stdout.filter(isValueJson).map(JSON.parse);

  if (jsonChunks.length === 0) {
    return "";
  }
  if (jsonChunks.length === 1) {
    return jsonChunks[0];
  }
  return jsonChunks;
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

function isValueJson(value) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  assertPath,
  safeStat,
  handleChildProcess,
  handleCommandOutput,
  isPathFile,
  isValueJson,
  resolveTargetPath,
};
