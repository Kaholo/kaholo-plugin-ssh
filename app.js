const { bootstrap } = require("@kaholo/plugin-library");

const {
  sshConnect,
  executeOverSsh,
  parseSshParams,
  uploadFileToRemote,
  uploadDirectoryToRemote,
  downloadFromRemote,
} = require("./ssh-helpers");
const {
  handleCommandOutput,
  assertPath,
  isPathFile,
} = require("./helpers");

async function executeCommand(params) {
  const {
    command,
  } = params;

  const connectionConfig = await parseSshParams(params);
  const sshClient = await sshConnect(connectionConfig);

  const commandOutput = await executeOverSsh(sshClient, command);

  return handleCommandOutput(commandOutput);
}

async function secureCopyToRemoteHost(params) {
  const {
    localPath,
    remotePath,
  } = params;

  const connectionConfig = await parseSshParams(params);

  await assertPath(localPath);
  const isLocalPathFile = await isPathFile(localPath);

  if (isLocalPathFile) {
    return uploadFileToRemote(connectionConfig, localPath, remotePath);
  }
  return uploadDirectoryToRemote(connectionConfig, localPath, remotePath);
}

async function secureCopyFromRemoteHost(params) {
  const {
    localPath,
    remotePath,
  } = params;

  const connectionConfig = await parseSshParams(params);
  return downloadFromRemote(connectionConfig, remotePath, localPath);
}

module.exports = bootstrap({
  executeCommand,
  secureCopyToRemoteHost,
  secureCopyFromRemoteHost,
});
