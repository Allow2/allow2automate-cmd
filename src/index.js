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

import TabContent from './Components/TabContent';
import ScriptManager from './ScriptManager';
import StateMonitor from './StateMonitor';
import PollingMonitor from './PollingMonitor';

function plugin(context) {

    var cmd = {};
    var state = null;
    var scriptManager = null;
    var stateMonitor = null;
    var pollingMonitor = null;

    //
    // onLoad: called on the main process when this plugin is loaded
    //
    cmd.onLoad = function(loadState) {
        console.log('cmd.onLoad', loadState);

        state = loadState || {
            scripts: {},
            triggers: {},
            monitors: {},
            sshConfigs: {}
        };

        // Initialize script manager
        scriptManager = new ScriptManager({
            onScriptOutput: (data) => {
                console.log('Script output:', data);
                // Could send to renderer for display
                context.sendToRenderer && context.sendToRenderer('scriptOutput', data);
            },
            onScriptComplete: (data) => {
                console.log('Script complete:', data);
                context.sendToRenderer && context.sendToRenderer('scriptComplete', data);
            },
            onScriptError: (data) => {
                console.error('Script error:', data);
                context.sendToRenderer && context.sendToRenderer('scriptError', data);
            }
        });

        // Initialize state monitor (Mode 1)
        stateMonitor = new StateMonitor(
            {
                onTriggerFired: async (data) => {
                    console.log('Trigger fired:', data);

                    // Execute associated script
                    const trigger = state.triggers[data.triggerId];
                    if (trigger && trigger.scriptId) {
                        const script = state.scripts[trigger.scriptId];
                        if (script) {
                            try {
                                await scriptManager.execute(script, data.params);
                            } catch (error) {
                                console.error('Error executing trigger script:', error);
                            }
                        }
                    }

                    context.sendToRenderer && context.sendToRenderer('triggerFired', data);
                },
                onMonitorError: (data) => {
                    console.error('State monitor error:', data);
                    context.sendToRenderer && context.sendToRenderer('monitorError', data);
                }
            },
            context.allow2
        );

        // Initialize polling monitor (Mode 2)
        pollingMonitor = new PollingMonitor(
            {
                onMonitorRun: (data) => {
                    console.log('Monitor run:', data);
                    context.sendToRenderer && context.sendToRenderer('monitorRun', data);
                },
                onConditionMet: (data) => {
                    console.log('Monitor condition met:', data);
                    context.sendToRenderer && context.sendToRenderer('conditionMet', data);
                },
                onMonitorError: (data) => {
                    console.error('Polling monitor error:', data);
                    context.sendToRenderer && context.sendToRenderer('monitorError', data);
                }
            },
            scriptManager,
            context.allow2
        );

        // Load saved triggers and monitors
        Object.values(state.triggers || {}).forEach(trigger => {
            stateMonitor.addTrigger(trigger);
        });

        Object.values(state.monitors || {}).forEach(monitor => {
            pollingMonitor.addMonitor(monitor);
        });

        // Start monitoring
        stateMonitor.start();
        pollingMonitor.startAll();

        // IPC handlers for renderer
        setupIPCHandlers(context);

        console.log('CMD plugin initialized');
    };

    //
    // newState: called on the main process when the persisted state is updated
    //
    cmd.newState = function(newState) {
        state = newState;
        console.log('cmd.newState', newState);
    };

    //
    // onSetEnabled: called when this plugin is enabled/disabled
    //
    cmd.onSetEnabled = function(enabled) {
        console.log('cmd.onSetEnabled', enabled);

        if (enabled) {
            stateMonitor?.start();
            pollingMonitor?.startAll();
        } else {
            stateMonitor?.stop();
            pollingMonitor?.stopAll();
        }
    };

    //
    // onUnload: called if the user is deleting the plugin
    //
    cmd.onUnload = function(callback) {
        console.log('cmd.onUnload');

        // Cleanup
        scriptManager?.cleanup();
        stateMonitor?.cleanup();
        pollingMonitor?.cleanup();

        callback(null);
    };

    //
    // Setup IPC handlers for communication with renderer
    //
    function setupIPCHandlers(context) {

        // Save script
        context.ipcMain.handle('saveScript', async (event, script) => {
            try {
                state.scripts[script.id] = script;
                context.configurationUpdate(state);
                return [null, { success: true, script }];
            } catch (error) {
                return [error];
            }
        });

        // Delete script
        context.ipcMain.handle('deleteScript', async (event, scriptId) => {
            try {
                delete state.scripts[scriptId];
                context.configurationUpdate(state);
                return [null, { success: true }];
            } catch (error) {
                return [error];
            }
        });

        // Execute script
        context.ipcMain.handle('executeScript', async (event, { scriptId, params }) => {
            try {
                const script = state.scripts[scriptId];
                if (!script) {
                    return [new Error('Script not found')];
                }

                const result = await scriptManager.execute(script, params);
                return [null, result];
            } catch (error) {
                return [error];
            }
        });

        // Test SSH connection
        context.ipcMain.handle('testSSH', async (event, sshConfig) => {
            try {
                const result = await scriptManager.testSSHConnection(sshConfig);
                return [null, result];
            } catch (error) {
                return [error];
            }
        });

        // Save SSH config
        context.ipcMain.handle('saveSSHConfig', async (event, config) => {
            try {
                state.sshConfigs[config.id] = config;
                context.configurationUpdate(state);
                return [null, { success: true, config }];
            } catch (error) {
                return [error];
            }
        });

        // Add trigger
        context.ipcMain.handle('addTrigger', async (event, trigger) => {
            try {
                state.triggers[trigger.id] = trigger;
                stateMonitor.addTrigger(trigger);
                context.configurationUpdate(state);
                return [null, { success: true, trigger }];
            } catch (error) {
                return [error];
            }
        });

        // Update trigger
        context.ipcMain.handle('updateTrigger', async (event, { triggerId, updates }) => {
            try {
                state.triggers[triggerId] = { ...state.triggers[triggerId], ...updates };
                stateMonitor.updateTrigger(triggerId, updates);
                context.configurationUpdate(state);
                return [null, { success: true }];
            } catch (error) {
                return [error];
            }
        });

        // Remove trigger
        context.ipcMain.handle('removeTrigger', async (event, triggerId) => {
            try {
                delete state.triggers[triggerId];
                stateMonitor.removeTrigger(triggerId);
                context.configurationUpdate(state);
                return [null, { success: true }];
            } catch (error) {
                return [error];
            }
        });

        // Add monitor
        context.ipcMain.handle('addMonitor', async (event, monitor) => {
            try {
                state.monitors[monitor.id] = monitor;
                pollingMonitor.addMonitor(monitor);
                context.configurationUpdate(state);
                return [null, { success: true, monitor }];
            } catch (error) {
                return [error];
            }
        });

        // Update monitor
        context.ipcMain.handle('updateMonitor', async (event, { monitorId, updates }) => {
            try {
                state.monitors[monitorId] = { ...state.monitors[monitorId], ...updates };
                pollingMonitor.updateMonitor(monitorId, updates);
                context.configurationUpdate(state);
                return [null, { success: true }];
            } catch (error) {
                return [error];
            }
        });

        // Remove monitor
        context.ipcMain.handle('removeMonitor', async (event, monitorId) => {
            try {
                delete state.monitors[monitorId];
                pollingMonitor.removeMonitor(monitorId);
                context.configurationUpdate(state);
                return [null, { success: true }];
            } catch (error) {
                return [error];
            }
        });

        // Get monitor status
        context.ipcMain.handle('getMonitorStatus', async (event, monitorId) => {
            try {
                const status = pollingMonitor.getStatus(monitorId);
                return [null, status];
            } catch (error) {
                return [error];
            }
        });
    }

    return cmd;
}

module.exports = {
    plugin,
    TabContent
};
