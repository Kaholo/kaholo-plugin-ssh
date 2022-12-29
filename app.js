const { bootstrap } = require("@kaholo/plugin-library");

const {
  parseSshParamsAndConnect,
  executeOverSsh,
} = require("./ssh-helpers");
const { handleCommandOutput } = require("./helpers");

async function executeCommand(params) {
  const {
    command,
  } = params;

  const sshClient = await parseSshParamsAndConnect(params);

  const commandOutput = await executeOverSsh(sshClient, command);

  return handleCommandOutput(commandOutput);
}

module.exports = bootstrap({
  executeCommand,
});
