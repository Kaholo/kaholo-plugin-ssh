const childProcess = require("child_process");
const { access } = require("fs/promises");
const fs = require("fs");
const util = require("util");

const exec = util.promisify(childProcess.exec);

async function assertPath(value) {
  try {
    await access(value, fs.constants.F_OK);
  } catch {
    return false;
  }
  return true;
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

module.exports = {
  assertPath,
  exec,
  handleChildProcess,
  handleCommandOutput,
};