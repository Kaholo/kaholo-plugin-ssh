const { Client: createScpClient } = require("node-scp");

const { handleChildProcess } = require("./helpers");
const {
  resolveRemotePath,
  commonScpErrorsCatcher,
  sshConnect,
} = require("./ssh-helpers");

async function executeOverSsh(connectionConfig, command, options) {
  const sshClient = await sshConnect(connectionConfig);
  return new Promise((res, rej) => {
    sshClient.exec(command, (error, channel) => {
      if (error) {
        return rej(error);
      }
      if (options?.endConnectionAfter) {
        channel.on("close", () => sshClient.end());
      }

      return handleChildProcess(channel, { exitSignal: "close" })
        .then(res)
        .catch(rej)
        .finally(() => sshClient.end());
    });
  });
}

async function uploadFileToRemote(connectionConfig, localPath, remotePath = "") {
  const scpClient = await createScpClient(connectionConfig);
  const resolvedRemotePath = await resolveRemotePath(scpClient, localPath, remotePath);

  return scpClient.uploadFile(localPath, resolvedRemotePath).catch(commonScpErrorsCatcher);
}

async function uploadDirectoryToRemote(connectionConfig, localPath, remotePath = "") {
  const scpClient = await createScpClient(connectionConfig);
  const resolvedRemotePath = await resolveRemotePath(scpClient, localPath, remotePath);

  return scpClient.uploadDir(localPath, resolvedRemotePath).catch(commonScpErrorsCatcher);
}

async function downloadFromRemote(connectionConfig, remotePath, localPath = "") {
  const scpClient = await createScpClient(connectionConfig);

  const remotePathStat = await scpClient.lstat(remotePath).catch(commonScpErrorsCatcher);

  if (remotePathStat.isFile()) {
    return scpClient.downloadFile(remotePath, localPath);
  }
  return scpClient.downloadDir(remotePath, localPath);
}

module.exports = {
  executeOverSsh,
  uploadDirectoryToRemote,
  uploadFileToRemote,
  downloadFromRemote,
};
