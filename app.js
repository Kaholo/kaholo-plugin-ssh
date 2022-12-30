const path = require("path");
const { bootstrap } = require("@kaholo/plugin-library");

const kaholoPluginLibrary = require("@kaholo/plugin-library");
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

  const absoluteLocalPath = path.resolve(localPath);
  await assertPath(absoluteLocalPath);
  const isLocalPathFile = await isPathFile(absoluteLocalPath);

  if (isLocalPathFile) {
    return uploadFileToRemote(connectionConfig, absoluteLocalPath, remotePath);
  }
  return uploadDirectoryToRemote(connectionConfig, absoluteLocalPath, remotePath);
}

async function secureCopyFromRemoteHost(params) {
  const {
    localPath,
    remotePath,
  } = params;

  const connectionConfig = await parseSshParams(params);
  return downloadFromRemote(connectionConfig, remotePath, localPath);
}

async function secureCopyFromVaultToRemoteHost(params) {
  const {
    vaultItem,
    remotePath,
  } = params;

  const connectionConfig = await parseSshParams(params);

  kaholoPluginLibrary.helpers.temporaryFileSentinel([vaultItem], async (localPath) => {
    const resolvedRemotePath = remotePath || `kaholo-vault-item-${Math.random().toString(36).slice(2)}`;
    await uploadFileToRemote(connectionConfig, localPath, resolvedRemotePath);
  });
}

module.exports = bootstrap({
  executeCommand,
  secureCopyToRemoteHost,
  secureCopyFromRemoteHost,
  secureCopyFromVaultToRemoteHost,
});
