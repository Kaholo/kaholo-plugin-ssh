const { readFile } = require("fs/promises");
const path = require("path");

const { Client: ScpClient } = require("node-scp");
const { Client: SshClient } = require("ssh2");

const { assertPath, handleChildProcess } = require("./helpers");

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
    console.info("Assuming Private Key parameter is a path, attempting to read the file contents.");
    await assertPath(privateKey);
    keyContent = await readFile(privateKey, { encoding: "utf-8" });
  }

  connectionConfig.privateKey = Buffer.from(keyContent);
  if (privateKeyPassphrase) {
    connectionConfig.passphrase = privateKeyPassphrase;
  }

  return connectionConfig;
}

function executeOverSsh(sshClient, command, options) {
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
  const scpClient = await ScpClient(connectionConfig);

  return scpClient.uploadFile(localPath, path.join(remotePath, path.basename(localPath)));
}

async function uploadDirectoryToRemote(connectionConfig, localPath, remotePath = "") {
  const scpClient = await ScpClient(connectionConfig);

  return scpClient.uploadDir(localPath, path.join(remotePath, path.basename(localPath)));
}

function isSshPrivateKey(value) {
  const containsBeginSignature = /^-----BEGIN [\w\s]{1,50} KEY-----/.test(value);
  const containsEndSignature = /-----END [\w\s]{1,50} KEY-----/g.test(value);

  return containsBeginSignature && containsEndSignature;
}

module.exports = {
  parseSshParams,
  sshConnect,
  executeOverSsh,
  uploadDirectoryToRemote,
  uploadFileToRemote,
};
