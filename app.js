// As of today (13.01.2023) "ssh2" package does not support ssh-rsa algorithm
// which is currently supported by OpenSSH, so this plugin would not work in
// some cases. A forked version of "ssh2" - "ssh2-1200-fix" package includes
// patch for this issue, that's why the plugin is using "ssh2-1200-fix" package
// instead of "ssh2". See https://github.com/mscdex/ssh2/pull/1200 for more details.
// This works fine for Execute Command method but for secure copy the plugin
// is using "node-scp" package, which under the hood is using the "ssh2" package.
// From a user's point of view, the same credentials will work for Execute Command
// method, but not for other methods. To fix this issue, we modified the require
// function to replace all "ssh2" require calls with "ssh2-1200-fix".
// We are aware that this solution is a huge no-no in JavaScript, but since this
// happens only in the scope of the plugin, and we didn't come up with any better
// solution, we agreed on that.
// This way plugin works as intended, this can be removed once "ssh2" package
// includes patch for ssh-rsa algorithm.

const Module = require("module");

const originalRequire = Module.prototype.require;
Module.prototype.require = function modifiedRequire(id, ...rest) {
  const resolvedId = id === "ssh2" ? "ssh2-1200-fix" : id;
  return originalRequire.call(this, resolvedId, ...rest);
};

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
