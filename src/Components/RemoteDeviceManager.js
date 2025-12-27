// Copyright [2021] [Allow2 Pty Ltd]
//
// Licensed under the Apache License, Version 2.0 (the "License")

'use strict';

import React, { Component } from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import IconButton from '@material-ui/core/IconButton';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import Chip from '@material-ui/core/Chip';

class RemoteDeviceManager extends Component {

    constructor(props) {
        super(props);

        this.state = {
            showEditor: false,
            editingDevice: null,
            name: '',
            host: '',
            port: '22',
            username: '',
            authMethod: 'password',
            password: '',
            privateKey: '',
            passphrase: ''
        };
    }

    handleAddDevice = () => {
        this.setState({
            showEditor: true,
            editingDevice: null,
            name: '',
            host: '',
            port: '22',
            username: '',
            authMethod: 'password',
            password: '',
            privateKey: '',
            passphrase: ''
        });
    };

    handleEditDevice = (device) => {
        this.setState({
            showEditor: true,
            editingDevice: device,
            name: device.name,
            host: device.host,
            port: device.port || '22',
            username: device.username,
            authMethod: device.authMethod || 'password',
            password: device.password || '',
            privateKey: device.privateKey || '',
            passphrase: device.passphrase || ''
        });
    };

    handleSaveDevice = async () => {
        const device = {
            id: this.state.editingDevice?.id || `device-${Date.now()}`,
            name: this.state.name,
            host: this.state.host,
            port: parseInt(this.state.port) || 22,
            username: this.state.username,
            authMethod: this.state.authMethod,
            ...(this.state.authMethod === 'password' && {
                password: this.state.password
            }),
            ...(this.state.authMethod === 'key' && {
                privateKey: this.state.privateKey,
                passphrase: this.state.passphrase
            }),
            updatedAt: Date.now()
        };

        this.props.onSave && await this.props.onSave(device);
        this.handleCloseEditor();
    };

    handleTestConnection = async () => {
        const config = {
            host: this.state.host,
            port: parseInt(this.state.port) || 22,
            username: this.state.username,
            ...(this.state.authMethod === 'password' && {
                password: this.state.password
            }),
            ...(this.state.authMethod === 'key' && {
                privateKey: this.state.privateKey,
                passphrase: this.state.passphrase
            })
        };

        this.props.onTest && await this.props.onTest(config);
    };

    handleDeleteDevice = (deviceId) => {
        if (window.confirm('Are you sure you want to delete this remote device?')) {
            this.props.onDelete && this.props.onDelete(deviceId);
        }
    };

    handleCloseEditor = () => {
        this.setState({ showEditor: false });
    };

    renderEditor() {
        return (
            <Dialog
                open={this.state.showEditor}
                onClose={this.handleCloseEditor}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {this.state.editingDevice ? 'Edit Remote Device' : 'Add Remote Device'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        label="Device Name"
                        value={this.state.name}
                        onChange={(e) => this.setState({ name: e.target.value })}
                        fullWidth
                        margin="normal"
                        required
                        helperText="Friendly name for this device"
                    />

                    <TextField
                        label="Hostname / IP Address"
                        value={this.state.host}
                        onChange={(e) => this.setState({ host: e.target.value })}
                        fullWidth
                        margin="normal"
                        required
                    />

                    <TextField
                        label="Port"
                        value={this.state.port}
                        onChange={(e) => this.setState({ port: e.target.value })}
                        fullWidth
                        margin="normal"
                        type="number"
                    />

                    <TextField
                        label="Username"
                        value={this.state.username}
                        onChange={(e) => this.setState({ username: e.target.value })}
                        fullWidth
                        margin="normal"
                        required
                    />

                    <FormControl component="fieldset" margin="normal" fullWidth>
                        <FormLabel component="legend">Authentication Method</FormLabel>
                        <RadioGroup
                            value={this.state.authMethod}
                            onChange={(e) => this.setState({ authMethod: e.target.value })}
                        >
                            <FormControlLabel
                                value="password"
                                control={<Radio />}
                                label="Password"
                            />
                            <FormControlLabel
                                value="key"
                                control={<Radio />}
                                label="SSH Key"
                            />
                        </RadioGroup>
                    </FormControl>

                    {this.state.authMethod === 'password' && (
                        <TextField
                            label="Password"
                            value={this.state.password}
                            onChange={(e) => this.setState({ password: e.target.value })}
                            fullWidth
                            margin="normal"
                            type="password"
                            required
                        />
                    )}

                    {this.state.authMethod === 'key' && (
                        <>
                            <TextField
                                label="Private Key"
                                value={this.state.privateKey}
                                onChange={(e) => this.setState({ privateKey: e.target.value })}
                                fullWidth
                                margin="normal"
                                multiline
                                rows={6}
                                required
                                helperText="Paste your SSH private key here"
                            />
                            <TextField
                                label="Passphrase (optional)"
                                value={this.state.passphrase}
                                onChange={(e) => this.setState({ passphrase: e.target.value })}
                                fullWidth
                                margin="normal"
                                type="password"
                                helperText="If your key is encrypted"
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleCloseEditor}>
                        Cancel
                    </Button>
                    <Button onClick={this.handleTestConnection} color="default">
                        Test Connection
                    </Button>
                    <Button
                        onClick={this.handleSaveDevice}
                        color="primary"
                        variant="contained"
                        disabled={!this.state.name || !this.state.host || !this.state.username}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    render() {
        const { devices } = this.props;
        const deviceList = Object.values(devices || {});

        return (
            <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                        Remote Devices
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={this.handleAddDevice}
                    >
                        Add Device
                    </Button>
                </Box>

                {deviceList.length === 0 ? (
                    <Box textAlign="center" p={4}>
                        <Typography variant="body1" color="textSecondary">
                            No remote devices configured
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Add a device to execute scripts remotely via SSH
                        </Typography>
                    </Box>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Host</TableCell>
                                <TableCell>Username</TableCell>
                                <TableCell>Auth</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {deviceList.map(device => (
                                <TableRow key={device.id}>
                                    <TableCell>{device.name}</TableCell>
                                    <TableCell>{device.host}:{device.port || 22}</TableCell>
                                    <TableCell>{device.username}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={device.authMethod === 'key' ? 'SSH Key' : 'Password'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => this.handleEditDevice(device)}
                                            title="Edit"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => this.handleDeleteDevice(device.id)}
                                            title="Delete"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {this.renderEditor()}
            </Box>
        );
    }
}

export default RemoteDeviceManager;
