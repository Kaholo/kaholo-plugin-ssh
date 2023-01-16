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
  const commandOutput = await sshService.executeOverSsh({
    connectionConfig,
    command,
  });

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

  let saveRemotePath;
  if (isLocalPathFile) {
    saveRemotePath = await sshService.uploadFileToRemote({
      connectionConfig,
      localPath: absoluteLocalPath,
      remotePath,
    });
  } else {
    saveRemotePath = await sshService.uploadDirectoryToRemote({
      connectionConfig,
      localPath: absoluteLocalPath,
      remotePath,
    });
  }

  return {
    remotePath: saveRemotePath,
  };
}

async function secureCopyFromRemoteHost(params) {
  const {
    localPath = ".",
    remotePath,
  } = params;

  const absoluteLocalPath = path.resolve(localPath);

  const connectionConfig = await parseSshParams(params);
  const saveLocalPath = await sshService.downloadFromRemote({
    connectionConfig,
    remotePath,
    localPath: absoluteLocalPath,
  });

  return {
    localPath: saveLocalPath,
  };
}

async function secureCopyFromVaultToRemoteHost(params) {
  const {
    vaultItem,
    remotePath,
  } = params;

  const connectionConfig = await parseSshParams(params);
  const result = { remotePath };

  await kaholoPluginLibrary.helpers.temporaryFileSentinel([vaultItem], async (localPath) => {
    const saveRemotePath = await sshService.uploadFileToRemote({
      connectionConfig,
      localPath,
      remotePath,
      pathResolutionOptions: {
        altBasename: `kaholo-vault-item-${Math.random().toString(36).slice(2)}`,
      },
    });

    result.remotePath = saveRemotePath;
  });

  return result;
}

module.exports = kaholoPluginLibrary.bootstrap({
  executeCommand,
  secureCopyToRemoteHost,
  secureCopyFromRemoteHost,
  secureCopyFromVaultToRemoteHost,
});
