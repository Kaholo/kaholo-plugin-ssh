# Kaholo SSH Plugin
The Secure Shell Protocol (SSH) is a cryptographic network protocol for operating network services securely over an unsecured network. Secure copy protocol (SCP) is a means of securely transferring computer files between a local host and a remote host. This plugin extends Kaholo functionality to include using SSH and SCP.

## Prerequisites
To make use of the SSH plugin, users will require an account enabled to use SSH and SCP on some remote machine. This remote machine must also be reachable on the network by the Kaholo agent.

## Access and Authentication
SSH (and SCP) access is most commonly controlled by means of keys - a public/private key pair. The plubic key is used to grant access on the remote machine and the private key is then used to authenticate and communicate securely with that remote. However, it is possible to use SSH with user/password instead of keys, or using a key with a passphrase, or a combination of these.

public/private key pairs are commonly generated using command `ssh-keygen`. The private key is kept safe and secret by the owner of the key. The public key is emailed to the administrator of the remote machine, where he creates an account for the user and puts the public key in file `~/.ssh/authorized_keys`. The user can then use SSH and SCP like so:

    # open command shell to remote machine
    ssh -i private.key username@remote-machine.mynet.org

    # copy file "myfile" to remote machine
    scp -i private.key myfile username@remote-machine.mynet.org:myfile

If passwords or passphrases are required these are asked either interactively or included in the command line. See the documentation on commands `ssh` and `scp` for details on these and other less common use cases.

The details of the connection are managed by Kaholo in a Kaholo Account. This provides convenient grouping of authentication parameters and use by default. This allows you to configure the account just once and then select it from a drop-down list each time you use an SSH Plugin action.

Access and configure accounts either in Settings | Plugins | SSH (the name of the plugin in this list is a hyperlink), or at the action level in field "Account", where "+ Add New Plugin Account" is available for selection.

### Account Parameter: Name ###
An arbitrary name to help you identify the account. It is suggested to use something descriptive of the user and systems that can be accessed using the account, e.g. "SSH alex@devops.int".

### Account Parameter: Hostname ###
This parameter is either the hostname or the IP address of the machine being accessed.

### Account Parameter: Username ###
The username on the remote machine, for whom the corresponding public key can be found in file `~/.ssh/authorized_keys`.

### Account Parameter: Password (Vault) ###
This is uncommonly used but if you SSH using password instead of a key, or both key and password, then put the password here. It is protected from logs, error messages, and appearing in configurations by the Kaholo Vault.

### Account Parameter: SSH Key (Vault) ###
This is the SSH PRIVATE Key. It is normally a file with several lines that begins with a line similar to this:

    -----BEGIN OPENSSH PRIVATE KEY-----

This key is also protected in the Kaholo Vault. If you SSH using username and password but no key, then leave this field empty.

### Account Parameter: SSH Key Passphrase (Vault) ###
Sometimes SSH keys are given a passphrase so to be used, one must both have the key and know the passphrase - a sort of 2-factor authentication scheme. If your SSH key comes with a passphrase, put the passphrase here.

### Account Parameter: Port ###
SSH is almost always on port 22 and if so, you may put that here or leave it empty. If your remote machine is listening for SSH connections on some other port, then put the port number here.

## Plugin Installation
For download, installation, upgrade, downgrade and troubleshooting of plugins in general, see [INSTALL.md](./INSTALL.md).

## Plugin Settings
This plugin has no plugin settings.

## method Execute Command
This method simply executes a command line on the remote machine via SSH, similar to the Command Line plugin. The only parameter required is the command itself.

## method Secure Copy to Remote Host
This method copies files and directories from the Kaholo Agent to the remote Host using a secure connection.

### parameter Local Path (Source)
This is the path, relative or absolute, to a file or directory on the Kaholo agent. If a directory, all subdirectories and files within are recursively copied.

### parameter Remote Path
This is the path, relative or absolute, to the file or directory on the remote machine. It is optional, and if omitted the file or directory will be copied over with the same name into the user's home directory. If used, this path can be used to relocate or rename files and directories, in a very similar way to the command line version of `scp`. Whether files or directories are renamed or overwritten depends on if the path is a file or a directory and whether or not it exists.

SCP will overwrite files and directories without warning, so familiarize yourself with how it works before putting it to production use.

The plugin outputs the full remote path used in Final Results, so you may look there to confirm the copy happened as you intended.

## method Secure Copy from Remote Host
This works just the like "Secure Copy to Remote Host" except it copies files in the opposite direction - from the remote to the Kaholo agent. The parameters work the same only in this method the Remote Path is the source of files and directories to copy.

The plugin outputs the full remote path used in Final Results, so you may look there to confirm the copy happened as you intended.

## method Secure Copy from Vault to Remote Host
This method takes an item from the Kaholo Vault and writes it to a file on a remote host. This is useful for installing credentials and security keys and other sensitive files to remote machines, and also for destroying them - e.g., by overwriting them with a random string stored in the Kaholo Vault. (If you want to write a Kaholo Vault item to the local Kaholo Agent, use the Text Editor plugin method Create File From Vault instead.)

The plugin outputs the full remote path used in Final Results, so you may look there to confirm the copy happened as you intended.

### parameter Vault Item (Vault)
Select which Vault Item it is you want to write to a file on the remote machine.

### parameter: Remote Path
Provide a path and file name on the remote machine where the Vault item will be written. If left empty, the file will go in the remote user's home directory and be given an arbitrary name.