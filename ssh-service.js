const { Client: createScpClient } = require("node-scp");

const {
  handleChildProcess,
  safeStat,
  resolveTargetPath,
} = require("./helpers");
const {
  commonScpErrorsCatcher,
  createSshConnection,
  safeRemoteStat,
} = require("./ssh-helpers");

async function executeOverSsh(params) {
  const {
    connectionConfig,
    command,
    endConnectionAfter = true,
  } = params;

  const sshClient = await createSshConnection(connectionConfig);

  return new Promise((res, rej) => {
    sshClient.exec(command, (error, channel) => {
      if (error) {
        return rej(error);
      }
      if (endConnectionAfter) {
        channel.on("close", () => sshClient.end());
      }

      return handleChildProcess(channel, { exitSignal: "close" })
        .then(res)
        .catch(rej)
        .finally(() => sshClient.end());
    });
  });
}

async function uploadFileToRemote(params) {
  const {
    connectionConfig,
    localPath,
    remotePath,
    pathResolutionOptions = {},
  } = params;

  const scpClient = await createScpClient(connectionConfig);
  const resolvedRemotePath = await resolveTargetPath({
    sourcePath: localPath,
    targetPath: remotePath,
    getSafeStat: (pathForStat) => safeRemoteStat(scpClient, pathForStat),
    ...pathResolutionOptions,
  });

  await scpClient.uploadFile(localPath, resolvedRemotePath).catch(commonScpErrorsCatcher);

  return resolvedRemotePath;
}

async function uploadDirectoryToRemote(params) {
  const {
    connectionConfig,
    localPath,
    remotePath,
    pathResolutionOptions = {},
  } = params;

  const scpClient = await createScpClient(connectionConfig);
  const resolvedRemotePath = await resolveTargetPath({
    sourcePath: localPath,
    targetPath: remotePath,
    getSafeStat: (pathForStat) => safeRemoteStat(scpClient, pathForStat),
    ...pathResolutionOptions,
  });

  await scpClient.uploadDir(localPath, resolvedRemotePath).catch(commonScpErrorsCatcher);

  return resolvedRemotePath;
}

async function downloadFromRemote(params) {
  const {
    connectionConfig,
    remotePath,
    localPath = "",
    pathResolutionOptions,
  } = params;

  const scpClient = await createScpClient(connectionConfig);
  const resolvedLocalPath = await resolveTargetPath({
    sourcePath: remotePath,
    targetPath: localPath,
    getSafeStat: safeStat,
    ...pathResolutionOptions,
  });

  const remotePathStat = await scpClient.lstat(remotePath).catch(commonScpErrorsCatcher);
  if (remotePathStat.isFile()) {
    await scpClient.downloadFile(remotePath, resolvedLocalPath);
  } else {
    const isLocalPathFile = (await safeStat(resolvedLocalPath)).isFile();
    if (isLocalPathFile) {
      throw new Error(`Can't save directory to ${resolvedLocalPath}, because it's a file, delete the file first or change the Local Path`);
    }

    await scpClient.downloadDir(remotePath, resolvedLocalPath);
  }

  return resolvedLocalPath;
}

module.exports = {
  executeOverSsh,
  uploadDirectoryToRemote,
  uploadFileToRemote,
  downloadFromRemote,
};
