const { Client: SshClient } = require("ssh2-1200-fix");

function createSshConnection(connectionConfig) {
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

  if (password) {
    connectionConfig.password = password;
  }
  if (privateKey) {
    connectionConfig.privateKey = privateKey;
  }
  if (privateKeyPassphrase) {
    connectionConfig.passphrase = privateKeyPassphrase;
  }

  return connectionConfig;
}

async function safeRemoteStat(scpClient, remotePath) {
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

function commonScpErrorsCatcher(error) {
  if (error.message === "No such file") {
    throw new Error("Remote Path not found. Must be an existing directory on the Remote System.");
  }
  throw error;
}

module.exports = {
  commonScpErrorsCatcher,
  parseSshParams,
  createSshConnection,
  safeRemoteStat,
};
