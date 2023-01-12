const { Client: createScpClient } = require("node-scp");

const { handleChildProcess } = require("./helpers");
const {
  resolveRemotePath,
  commonScpErrorsCatcher,
  sshConnect,
} = require("./ssh-helpers");

async function executeOverSsh(params) {
  const {
    connectionConfig,
    command,
    endConnectionAfter = true,
  } = params;

  const sshClient = await sshConnect(connectionConfig);

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
  const resolvedRemotePath = await resolveRemotePath({
    scpClient,
    localPath,
    remotePath,
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
  const resolvedRemotePath = await resolveRemotePath({
    scpClient,
    localPath,
    remotePath,
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
  } = params;
  const scpClient = await createScpClient(connectionConfig);

  const remotePathStat = await scpClient.lstat(remotePath).catch(commonScpErrorsCatcher);

  if (remotePathStat.isFile()) {
    await scpClient.downloadFile(remotePath, localPath);
  } else {
    await scpClient.downloadDir(remotePath, localPath);
  }

  return localPath;
}

module.exports = {
  executeOverSsh,
  uploadDirectoryToRemote,
  uploadFileToRemote,
  downloadFromRemote,
};
