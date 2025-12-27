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

import React, { Component } from 'react';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import ScriptEditor from './ScriptEditor';
import ScriptList from './ScriptList';
import RemoteDeviceManager from './RemoteDeviceManager';
import TriggerConfig from './TriggerConfig';
import PollingConfig from './PollingConfig';

class TabContent extends Component {

    constructor(props) {
        super(props);

        this.state = {
            activeTab: 0,
            showScriptEditor: false,
            editingScript: null,
            snackbar: null
        };

        // Listen for events from main process
        this.setupIPCListeners();
    }

    setupIPCListeners() {
        if (!this.props.ipc) return;

        this.props.ipc.on('scriptOutput', (event, data) => {
            console.log('Script output:', data);
        });

        this.props.ipc.on('scriptComplete', (event, data) => {
            this.showSnackbar('success', `Script "${data.script}" completed successfully`);
        });

        this.props.ipc.on('scriptError', (event, data) => {
            this.showSnackbar('error', `Script error: ${data.error}`);
        });

        this.props.ipc.on('triggerFired', (event, data) => {
            this.showSnackbar('info', `Trigger "${data.trigger.name}" fired`);
        });

        this.props.ipc.on('monitorRun', (event, data) => {
            console.log('Monitor run:', data);
        });

        this.props.ipc.on('conditionMet', (event, data) => {
            this.showSnackbar('info', `Monitor "${data.monitor.name}" condition met`);
        });

        this.props.ipc.on('monitorError', (event, data) => {
            this.showSnackbar('error', `Monitor error: ${data.error}`);
        });
    }

    showSnackbar(severity, message) {
        this.setState({
            snackbar: { severity, message }
        });
    }

    handleCloseSnackbar = () => {
        this.setState({ snackbar: null });
    };

    // Script Management
    handleCreateScript = () => {
        this.setState({
            showScriptEditor: true,
            editingScript: null
        });
    };

    handleEditScript = (script) => {
        this.setState({
            showScriptEditor: true,
            editingScript: script
        });
    };

    handleSaveScript = async (script) => {
        try {
            const [err] = await this.props.ipc.invoke('saveScript', script);
            if (err) throw err;

            this.setState({ showScriptEditor: false });
            this.showSnackbar('success', 'Script saved successfully');
        } catch (error) {
            this.showSnackbar('error', `Failed to save script: ${error.message}`);
        }
    };

    handleDeleteScript = async (scriptId) => {
        try {
            const [err] = await this.props.ipc.invoke('deleteScript', scriptId);
            if (err) throw err;

            this.showSnackbar('success', 'Script deleted successfully');
        } catch (error) {
            this.showSnackbar('error', `Failed to delete script: ${error.message}`);
        }
    };

    handleExecuteScript = async (script, params = {}) => {
        try {
            this.showSnackbar('info', `Executing script "${script.name}"...`);

            const [err, result] = await this.props.ipc.invoke('executeScript', {
                scriptId: script.id,
                params
            });

            if (err) throw err;

            this.showSnackbar('success', `Script executed successfully`);
            console.log('Script result:', result);
        } catch (error) {
            this.showSnackbar('error', `Script execution failed: ${error.message}`);
        }
    };

    handleTestScript = async (script, params) => {
        this.handleExecuteScript(script, params);
    };

    // Remote Device Management
    handleSaveRemoteDevice = async (device) => {
        try {
            const [err] = await this.props.ipc.invoke('saveSSHConfig', device);
            if (err) throw err;

            this.showSnackbar('success', 'Remote device saved successfully');
        } catch (error) {
            this.showSnackbar('error', `Failed to save device: ${error.message}`);
        }
    };

    handleDeleteRemoteDevice = async (deviceId) => {
        try {
            const newData = { ...this.props.data };
            delete newData.sshConfigs[deviceId];
            this.props.configurationUpdate(newData);

            this.showSnackbar('success', 'Remote device deleted successfully');
        } catch (error) {
            this.showSnackbar('error', `Failed to delete device: ${error.message}`);
        }
    };

    handleTestSSH = async (config) => {
        try {
            this.showSnackbar('info', 'Testing SSH connection...');

            const [err, result] = await this.props.ipc.invoke('testSSH', config);

            if (err) throw err;

            this.showSnackbar('success', result.message);
        } catch (error) {
            this.showSnackbar('error', `Connection failed: ${error.message}`);
        }
    };

    // Trigger Management
    handleSaveTrigger = async (trigger) => {
        try {
            const [err] = await this.props.ipc.invoke('addTrigger', trigger);
            if (err) throw err;

            this.showSnackbar('success', 'Trigger saved successfully');
        } catch (error) {
            this.showSnackbar('error', `Failed to save trigger: ${error.message}`);
        }
    };

    handleDeleteTrigger = async (triggerId) => {
        try {
            const [err] = await this.props.ipc.invoke('removeTrigger', triggerId);
            if (err) throw err;

            this.showSnackbar('success', 'Trigger deleted successfully');
        } catch (error) {
            this.showSnackbar('error', `Failed to delete trigger: ${error.message}`);
        }
    };

    // Monitor Management
    handleSaveMonitor = async (monitor) => {
        try {
            const [err] = await this.props.ipc.invoke('addMonitor', monitor);
            if (err) throw err;

            this.showSnackbar('success', 'Monitor saved successfully');
        } catch (error) {
            this.showSnackbar('error', `Failed to save monitor: ${error.message}`);
        }
    };

    handleDeleteMonitor = async (monitorId) => {
        try {
            const [err] = await this.props.ipc.invoke('removeMonitor', monitorId);
            if (err) throw err;

            this.showSnackbar('success', 'Monitor deleted successfully');
        } catch (error) {
            this.showSnackbar('error', `Failed to delete monitor: ${error.message}`);
        }
    };

    handleRunMonitorNow = async (monitorId) => {
        try {
            this.showSnackbar('info', 'Running monitor...');
            // Trigger immediate execution via the polling monitor
            // This would require adding an IPC handler in index.js
        } catch (error) {
            this.showSnackbar('error', `Failed to run monitor: ${error.message}`);
        }
    };

    render() {
        if (!this.props || !this.props.plugin || !this.props.data) {
            return (
                <div style={{ padding: 20, textAlign: 'center' }}>
                    Loading...
                </div>
            );
        }

        const { data, children } = this.props;
        const scripts = data.scripts || {};
        const triggers = data.triggers || {};
        const monitors = data.monitors || {};
        const sshConfigs = data.sshConfigs || {};
        const remoteDevices = Object.values(sshConfigs);

        return (
            <div style={{ padding: 0 }}>
                <Paper square>
                    <Tabs
                        value={this.state.activeTab}
                        onChange={(e, value) => this.setState({ activeTab: value })}
                        indicatorColor="primary"
                        textColor="primary"
                    >
                        <Tab label="Scripts" />
                        <Tab label="Event Triggers" />
                        <Tab label="Polling Monitors" />
                        <Tab label="Remote Devices" />
                    </Tabs>
                </Paper>

                <Box p={3}>
                    {/* Scripts Tab */}
                    {this.state.activeTab === 0 && (
                        <div>
                            <Box mb={2}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={this.handleCreateScript}
                                >
                                    Create Script
                                </Button>
                            </Box>
                            <ScriptList
                                scripts={scripts}
                                remoteDevices={remoteDevices}
                                onEdit={this.handleEditScript}
                                onDelete={this.handleDeleteScript}
                                onExecute={this.handleExecuteScript}
                            />
                        </div>
                    )}

                    {/* Event Triggers Tab */}
                    {this.state.activeTab === 1 && (
                        <TriggerConfig
                            triggers={triggers}
                            scripts={scripts}
                            children={children}
                            onSave={this.handleSaveTrigger}
                            onDelete={this.handleDeleteTrigger}
                        />
                    )}

                    {/* Polling Monitors Tab */}
                    {this.state.activeTab === 2 && (
                        <PollingConfig
                            monitors={monitors}
                            scripts={scripts}
                            children={children}
                            onSave={this.handleSaveMonitor}
                            onDelete={this.handleDeleteMonitor}
                            onRunNow={this.handleRunMonitorNow}
                        />
                    )}

                    {/* Remote Devices Tab */}
                    {this.state.activeTab === 3 && (
                        <RemoteDeviceManager
                            devices={sshConfigs}
                            onSave={this.handleSaveRemoteDevice}
                            onDelete={this.handleDeleteRemoteDevice}
                            onTest={this.handleTestSSH}
                        />
                    )}
                </Box>

                {/* Script Editor Dialog */}
                <ScriptEditor
                    open={this.state.showScriptEditor}
                    script={this.state.editingScript}
                    remoteDevices={remoteDevices}
                    onSave={this.handleSaveScript}
                    onTest={this.handleTestScript}
                    onClose={() => this.setState({ showScriptEditor: false })}
                />

                {/* Snackbar for notifications */}
                {this.state.snackbar && (
                    <Snackbar
                        open={true}
                        autoHideDuration={6000}
                        onClose={this.handleCloseSnackbar}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    >
                        <Alert
                            onClose={this.handleCloseSnackbar}
                            severity={this.state.snackbar.severity}
                            variant="filled"
                            elevation={6}
                        >
                            {this.state.snackbar.message}
                        </Alert>
                    </Snackbar>
                )}
            </div>
        );
    }
}

export default TabContent;
