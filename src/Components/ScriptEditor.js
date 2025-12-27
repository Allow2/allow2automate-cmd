// Copyright [2021] [Allow2 Pty Ltd]
//
// Licensed under the Apache License, Version 2.0 (the "License")

'use strict';

import React, { Component } from 'react';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import Chip from '@material-ui/core/Chip';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';

class ScriptEditor extends Component {

    constructor(props) {
        super(props);

        this.state = {
            id: props.script?.id || `script-${Date.now()}`,
            name: props.script?.name || '',
            description: props.script?.description || '',
            script: props.script?.script || '',
            useSSH: props.script?.useSSH || false,
            remoteDeviceId: props.script?.remoteDeviceId || '',
            timeout: props.script?.timeout || 30000,
            workingDir: props.script?.workingDir || '',
            env: props.script?.env || {},
            parameters: props.script?.parameters || [],
            newParam: ''
        };
    }

    handleChange = (field) => (event) => {
        this.setState({
            [field]: event.target.value
        });
    };

    handleSwitchChange = (field) => (event) => {
        this.setState({
            [field]: event.target.checked
        });
    };

    handleAddParameter = () => {
        if (this.state.newParam.trim()) {
            this.setState({
                parameters: [...this.state.parameters, this.state.newParam.trim()],
                newParam: ''
            });
        }
    };

    handleDeleteParameter = (param) => {
        this.setState({
            parameters: this.state.parameters.filter(p => p !== param)
        });
    };

    handleSave = () => {
        const script = {
            id: this.state.id,
            name: this.state.name,
            description: this.state.description,
            script: this.state.script,
            useSSH: this.state.useSSH,
            remoteDeviceId: this.state.remoteDeviceId,
            timeout: parseInt(this.state.timeout) || 30000,
            workingDir: this.state.workingDir,
            env: this.state.env,
            parameters: this.state.parameters,
            updatedAt: Date.now()
        };

        this.props.onSave(script);
    };

    handleTest = async () => {
        const script = {
            id: this.state.id,
            name: this.state.name,
            script: this.state.script,
            useSSH: this.state.useSSH,
            remoteDeviceId: this.state.remoteDeviceId,
            timeout: parseInt(this.state.timeout) || 30000,
            workingDir: this.state.workingDir
        };

        // Build test parameters object
        const testParams = this.state.parameters.reduce((obj, param) => {
            obj[param] = `test_${param}`;
            return obj;
        }, {});

        this.props.onTest && this.props.onTest(script, testParams);
    };

    renderParameterHelp = () => {
        return (
            <Box mt={1} mb={1}>
                <Typography variant="caption" color="textSecondary">
                    <strong>Available parameters (use mustache syntax):</strong>
                </Typography>
                <Typography variant="caption" display="block" color="textSecondary">
                    • {`{{childName}}`} - Name of the child
                </Typography>
                <Typography variant="caption" display="block" color="textSecondary">
                    • {`{{childId}}`} - ID of the child
                </Typography>
                <Typography variant="caption" display="block" color="textSecondary">
                    • {`{{activityType}}`} - Activity type (gaming, internet, etc.)
                </Typography>
                <Typography variant="caption" display="block" color="textSecondary">
                    • {`{{quotaRemaining}}`} - Remaining quota time
                </Typography>
                <Typography variant="caption" display="block" color="textSecondary">
                    • {`{{timestamp}}`} - Current timestamp
                </Typography>
                <Typography variant="caption" display="block" color="textSecondary">
                    • Custom parameters you define below
                </Typography>
            </Box>
        );
    };

    render() {
        const { open, onClose, remoteDevices } = this.props;

        return (
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {this.props.script ? 'Edit Script' : 'Create Script'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        label="Script Name"
                        value={this.state.name}
                        onChange={this.handleChange('name')}
                        fullWidth
                        margin="normal"
                        required
                    />

                    <TextField
                        label="Description"
                        value={this.state.description}
                        onChange={this.handleChange('description')}
                        fullWidth
                        margin="normal"
                        multiline
                        rows={2}
                    />

                    {this.renderParameterHelp()}

                    <TextField
                        label="Script"
                        value={this.state.script}
                        onChange={this.handleChange('script')}
                        fullWidth
                        margin="normal"
                        multiline
                        rows={10}
                        required
                        variant="outlined"
                        placeholder="Enter your script here. Use {{parameterName}} for substitution."
                        helperText="Example: echo 'Gaming time expired for {{childName}}'"
                    />

                    <Box mt={2} mb={2}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={this.state.useSSH}
                                    onChange={this.handleSwitchChange('useSSH')}
                                    color="primary"
                                />
                            }
                            label="Execute on Remote Device (SSH)"
                        />
                    </Box>

                    {this.state.useSSH && (
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Remote Device</InputLabel>
                            <Select
                                value={this.state.remoteDeviceId}
                                onChange={this.handleChange('remoteDeviceId')}
                                required
                            >
                                {remoteDevices?.map(device => (
                                    <MenuItem key={device.id} value={device.id}>
                                        {device.name} ({device.host})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {!this.state.useSSH && (
                        <TextField
                            label="Working Directory (optional)"
                            value={this.state.workingDir}
                            onChange={this.handleChange('workingDir')}
                            fullWidth
                            margin="normal"
                            placeholder="/path/to/directory"
                        />
                    )}

                    <TextField
                        label="Timeout (ms)"
                        value={this.state.timeout}
                        onChange={this.handleChange('timeout')}
                        fullWidth
                        margin="normal"
                        type="number"
                        helperText="Maximum execution time in milliseconds"
                    />

                    <Box mt={2}>
                        <Typography variant="subtitle2">Custom Parameters</Typography>
                        <Box display="flex" alignItems="center" mt={1}>
                            <TextField
                                label="Parameter Name"
                                value={this.state.newParam}
                                onChange={this.handleChange('newParam')}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        this.handleAddParameter();
                                    }
                                }}
                                placeholder="parameterName"
                                style={{ marginRight: 8 }}
                            />
                            <Button
                                variant="outlined"
                                onClick={this.handleAddParameter}
                                disabled={!this.state.newParam.trim()}
                            >
                                Add
                            </Button>
                        </Box>
                        <Box mt={1}>
                            {this.state.parameters.map(param => (
                                <Chip
                                    key={param}
                                    label={`{{${param}}}`}
                                    onDelete={() => this.handleDeleteParameter(param)}
                                    style={{ margin: 4 }}
                                />
                            ))}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={this.handleTest}
                        color="default"
                        disabled={!this.state.name || !this.state.script}
                    >
                        Test
                    </Button>
                    <Button
                        onClick={this.handleSave}
                        color="primary"
                        variant="contained"
                        disabled={!this.state.name || !this.state.script}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default ScriptEditor;
