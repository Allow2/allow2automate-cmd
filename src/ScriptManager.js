// Copyright [2021] [Allow2 Pty Ltd]
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

import { spawn, exec } from 'child_process';
import { Client as SSHClient } from 'ssh2';
import Mustache from 'mustache';

export default class ScriptManager {

    constructor(listener) {
        this.listener = listener;
        this.sshConnections = {}; // Cache SSH connections by host
    }

    /**
     * Substitute mustache parameters in script
     * @param {string} script - Script template with {{parameters}}
     * @param {object} params - Parameter values
     * @returns {string} - Rendered script
     */
    substituteParameters(script, params) {
        try {
            return Mustache.render(script, params);
        } catch (error) {
            console.error('Parameter substitution error:', error);
            throw new Error(`Failed to substitute parameters: ${error.message}`);
        }
    }

    /**
     * Execute script locally
     * @param {string} script - Script to execute
     * @param {object} params - Parameters for substitution
     * @param {object} options - Execution options
     * @returns {Promise} - Execution result
     */
    executeLocal(script, params = {}, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const renderedScript = this.substituteParameters(script, params);

                const shell = options.shell || (process.platform === 'win32' ? 'cmd.exe' : '/bin/bash');
                const shellFlag = process.platform === 'win32' ? '/c' : '-c';

                const child = spawn(shell, [shellFlag, renderedScript], {
                    cwd: options.cwd || process.cwd(),
                    env: { ...process.env, ...options.env },
                    timeout: options.timeout || 30000
                });

                let stdout = '';
                let stderr = '';

                child.stdout.on('data', (data) => {
                    stdout += data.toString();
                    this.listener?.onScriptOutput?.({
                        type: 'stdout',
                        data: data.toString(),
                        script: options.scriptName
                    });
                });

                child.stderr.on('data', (data) => {
                    stderr += data.toString();
                    this.listener?.onScriptOutput?.({
                        type: 'stderr',
                        data: data.toString(),
                        script: options.scriptName
                    });
                });

                child.on('close', (code) => {
                    const result = {
                        exitCode: code,
                        stdout: stdout.trim(),
                        stderr: stderr.trim(),
                        success: code === 0
                    };

                    this.listener?.onScriptComplete?.({
                        script: options.scriptName,
                        result,
                        mode: 'local'
                    });

                    if (code === 0) {
                        resolve(result);
                    } else {
                        reject(new Error(`Script exited with code ${code}: ${stderr}`));
                    }
                });

                child.on('error', (error) => {
                    this.listener?.onScriptError?.({
                        script: options.scriptName,
                        error: error.message,
                        mode: 'local'
                    });
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Execute script via SSH
     * @param {string} script - Script to execute
     * @param {object} params - Parameters for substitution
     * @param {object} sshConfig - SSH connection config
     * @param {object} options - Execution options
     * @returns {Promise} - Execution result
     */
    executeSSH(script, params = {}, sshConfig, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const renderedScript = this.substituteParameters(script, params);

                const conn = new SSHClient();
                let stdout = '';
                let stderr = '';

                conn.on('ready', () => {
                    conn.exec(renderedScript, (err, stream) => {
                        if (err) {
                            conn.end();
                            return reject(err);
                        }

                        stream.on('close', (code, signal) => {
                            conn.end();

                            const result = {
                                exitCode: code,
                                signal,
                                stdout: stdout.trim(),
                                stderr: stderr.trim(),
                                success: code === 0
                            };

                            this.listener?.onScriptComplete?.({
                                script: options.scriptName,
                                result,
                                mode: 'ssh',
                                host: sshConfig.host
                            });

                            if (code === 0) {
                                resolve(result);
                            } else {
                                reject(new Error(`SSH script exited with code ${code}: ${stderr}`));
                            }
                        });

                        stream.on('data', (data) => {
                            stdout += data.toString();
                            this.listener?.onScriptOutput?.({
                                type: 'stdout',
                                data: data.toString(),
                                script: options.scriptName,
                                mode: 'ssh'
                            });
                        });

                        stream.stderr.on('data', (data) => {
                            stderr += data.toString();
                            this.listener?.onScriptOutput?.({
                                type: 'stderr',
                                data: data.toString(),
                                script: options.scriptName,
                                mode: 'ssh'
                            });
                        });
                    });
                });

                conn.on('error', (err) => {
                    this.listener?.onScriptError?.({
                        script: options.scriptName,
                        error: err.message,
                        mode: 'ssh',
                        host: sshConfig.host
                    });
                    reject(err);
                });

                // Connect to SSH
                conn.connect({
                    host: sshConfig.host,
                    port: sshConfig.port || 22,
                    username: sshConfig.username,
                    password: sshConfig.password,
                    privateKey: sshConfig.privateKey,
                    passphrase: sshConfig.passphrase,
                    readyTimeout: options.timeout || 30000
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Execute script (auto-detect local or SSH)
     * @param {object} scriptConfig - Full script configuration
     * @param {object} params - Parameters for substitution
     * @returns {Promise} - Execution result
     */
    async execute(scriptConfig, params = {}) {
        const options = {
            scriptName: scriptConfig.name,
            timeout: scriptConfig.timeout,
            cwd: scriptConfig.workingDir,
            env: scriptConfig.env
        };

        if (scriptConfig.useSSH && scriptConfig.sshConfig) {
            return this.executeSSH(
                scriptConfig.script,
                params,
                scriptConfig.sshConfig,
                options
            );
        } else {
            return this.executeLocal(
                scriptConfig.script,
                params,
                options
            );
        }
    }

    /**
     * Test SSH connection
     * @param {object} sshConfig - SSH configuration
     * @returns {Promise} - Connection test result
     */
    testSSHConnection(sshConfig) {
        return new Promise((resolve, reject) => {
            const conn = new SSHClient();

            const timeout = setTimeout(() => {
                conn.end();
                reject(new Error('Connection timeout'));
            }, 10000);

            conn.on('ready', () => {
                clearTimeout(timeout);
                conn.end();
                resolve({
                    success: true,
                    message: 'SSH connection successful',
                    host: sshConfig.host,
                    port: sshConfig.port || 22
                });
            });

            conn.on('error', (err) => {
                clearTimeout(timeout);
                reject(new Error(`SSH connection failed: ${err.message}`));
            });

            conn.connect({
                host: sshConfig.host,
                port: sshConfig.port || 22,
                username: sshConfig.username,
                password: sshConfig.password,
                privateKey: sshConfig.privateKey,
                passphrase: sshConfig.passphrase,
                readyTimeout: 10000
            });
        });
    }

    /**
     * Parse JSON response from script output
     * @param {string} output - Script stdout
     * @returns {object} - Parsed JSON or error
     */
    parseJSONResponse(output) {
        try {
            return {
                success: true,
                data: JSON.parse(output)
            };
        } catch (error) {
            return {
                success: false,
                error: `Invalid JSON: ${error.message}`,
                raw: output
            };
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Close any cached SSH connections
        Object.values(this.sshConnections).forEach(conn => {
            try {
                conn.end();
            } catch (e) {
                console.error('Error closing SSH connection:', e);
            }
        });
        this.sshConnections = {};
    }
}
