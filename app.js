const path = require("path");
const kaholoPluginLibrary = require("@kaholo/plugin-library");

const sshService = require("./ssh-service");
const { parseSshParams } = require("./ssh-helpers");
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
  const commandOutput = await sshService.executeOverSsh(connectionConfig, command);

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
    return sshService.uploadFileToRemote(connectionConfig, absoluteLocalPath, remotePath);
  }
  return sshService.uploadDirectoryToRemote(connectionConfig, absoluteLocalPath, remotePath);
}

async function secureCopyFromRemoteHost(params) {
  const {
    localPath,
    remotePath,
  } = params;

  const connectionConfig = await parseSshParams(params);
  return sshService.downloadFromRemote(connectionConfig, remotePath, localPath);
}

async function secureCopyFromVaultToRemoteHost(params) {
  const {
    vaultItem,
    remotePath,
  } = params;

  const connectionConfig = await parseSshParams(params);

  return kaholoPluginLibrary.helpers.temporaryFileSentinel([vaultItem], async (localPath) => {
    let resolvedRemotePath = remotePath;
    if (!remotePath) {
      resolvedRemotePath = `kaholo-vault-item-${Math.random().toString(36).slice(2)}`;
      console.error(`Remote Path parameter was not provided, vault item will be saved at ~/${resolvedRemotePath} on the remote host`);
    }

    await sshService.uploadFileToRemote(connectionConfig, localPath, resolvedRemotePath);
  });
}

module.exports = kaholoPluginLibrary.bootstrap({
  executeCommand,
  secureCopyToRemoteHost,
  secureCopyFromRemoteHost,
  secureCopyFromVaultToRemoteHost,
});
