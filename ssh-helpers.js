const { readFile } = require("fs/promises");
const path = require("path");
const { Client: SshClient } = require("ssh2-1200-fix");

const { assertPath } = require("./helpers");

function sshConnect(connectionConfig) {
  const sshClient = new SshClient();

  return new Promise((res, rej) => {
    sshClient
      .connect(connectionConfig)
      .on("ready", () => res(sshClient))
      .on("error", rej);
  });
}

async function parseSshParams(params) {
  const {
    hostname,
    username,
    password,
    privateKey,
    privateKeyPassphrase,
    port,
  } = params;

  if (!privateKey && !password) {
    throw new Error("Password or Private Key is required");
  }

  const connectionConfig = {
    host: hostname,
    username,
    port,
  };

  if (!privateKey) {
    connectionConfig.password = password;
    return connectionConfig;
  }

  let keyContent = privateKey;
  if (!isSshPrivateKey(privateKey)) {
    console.error("Assuming Private Key parameter is a path, attempting to read the file contents.");

    const absolutePathToPrivateKey = path.resolve(privateKey);
    await assertPath(absolutePathToPrivateKey);
    keyContent = await readFile(absolutePathToPrivateKey);
  }

  connectionConfig.privateKey = keyContent;
  if (privateKeyPassphrase) {
    connectionConfig.passphrase = privateKeyPassphrase;
  }

  return connectionConfig;
}

async function resolveRemotePath(scpClient, localPath, remotePath) {
  let resolvedRemotePath = remotePath;

  const remotePathStat = await lstatSafe(scpClient, remotePath || "./");
  if (remotePathStat.exists && remotePathStat.isDirectory()) {
    resolvedRemotePath = path.join(remotePath, path.basename(localPath));
  }

  return resolvedRemotePath;
}

async function lstatSafe(scpClient, remotePath) {
  let stat;
  try {
    stat = await scpClient.lstat(remotePath);
    Object.defineProperty(stat, "exists", {
      value: true,
    });
  } catch {
    stat = { exists: false };
  }

  return stat;
}

function isSshPrivateKey(value) {
  const containsBeginSignature = /^-----BEGIN [\w\s]{1,50} KEY-----/.test(value);
  const containsEndSignature = /-----END [\w\s]{1,50} KEY-----/g.test(value);

  return containsBeginSignature && containsEndSignature;
}

function commonScpErrorsCatcher(error) {
  if (error.message === "No such file") {
    throw new Error("Remote Path not found. Must be an existing directory on the Remote System.");
  }
  throw error;
}

module.exports = {
  commonScpErrorsCatcher,
  resolveRemotePath,
  parseSshParams,
  sshConnect,
};
