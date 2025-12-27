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
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';

const INTERVAL_PRESETS = [
    { value: 60000, label: '1 minute' },
    { value: 300000, label: '5 minutes' },
    { value: 600000, label: '10 minutes' },
    { value: 1800000, label: '30 minutes' },
    { value: 3600000, label: '1 hour' }
];

const CONDITION_OPERATORS = [
    { value: 'truthy', label: 'Is True' },
    { value: 'falsy', label: 'Is False' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' }
];

const ACTIVITY_TYPES = [
    'gaming',
    'internet',
    'screen',
    'electrical',
    'homework',
    'chores',
    'custom'
];

class PollingConfig extends Component {

    constructor(props) {
        super(props);

        this.state = {
            showEditor: false,
            editingMonitor: null,
            name: '',
            scriptId: '',
            intervalMs: 60000,
            conditionField: 'active',
            conditionOperator: 'truthy',
            conditionValue: '',
            reportUsage: true,
            childId: '',
            activityType: 'gaming',
            usageAmount: 1,
            enabled: true
        };
    }

    handleAddMonitor = () => {
        this.setState({
            showEditor: true,
            editingMonitor: null,
            name: '',
            scriptId: '',
            intervalMs: 60000,
            conditionField: 'active',
            conditionOperator: 'truthy',
            conditionValue: '',
            reportUsage: true,
            childId: '',
            activityType: 'gaming',
            usageAmount: 1,
            enabled: true
        });
    };

    handleEditMonitor = (monitor) => {
        this.setState({
            showEditor: true,
            editingMonitor: monitor,
            name: monitor.name,
            scriptId: monitor.scriptConfig?.id || '',
            intervalMs: monitor.intervalMs,
            conditionField: monitor.conditionField,
            conditionOperator: monitor.conditionOperator,
            conditionValue: monitor.conditionValue || '',
            reportUsage: monitor.reportUsage,
            childId: monitor.childId,
            activityType: monitor.activityType,
            usageAmount: monitor.usageAmount || 1,
            enabled: monitor.enabled
        });
    };

    handleSaveMonitor = () => {
        const script = this.props.scripts?.[this.state.scriptId];
        const child = this.props.children?.find(c => c.id === this.state.childId);

        const monitor = {
            id: this.state.editingMonitor?.id || `monitor-${Date.now()}`,
            name: this.state.name,
            scriptConfig: script,
            intervalMs: this.state.intervalMs,
            conditionField: this.state.conditionField,
            conditionOperator: this.state.conditionOperator,
            conditionValue: this.state.conditionValue,
            reportUsage: this.state.reportUsage,
            childId: this.state.childId,
            childName: child?.name || 'Unknown',
            activityType: this.state.activityType,
            usageAmount: this.state.usageAmount,
            enabled: this.state.enabled,
            updatedAt: Date.now()
        };

        this.props.onSave && this.props.onSave(monitor);
        this.handleCloseEditor();
    };

    handleDeleteMonitor = (monitorId) => {
        if (window.confirm('Are you sure you want to delete this monitor?')) {
            this.props.onDelete && this.props.onDelete(monitorId);
        }
    };

    handleRunNow = (monitor) => {
        this.props.onRunNow && this.props.onRunNow(monitor.id);
    };

    handleCloseEditor = () => {
        this.setState({ showEditor: false });
    };

    needsConditionValue() {
        return ['equals', 'not_equals', 'greater_than', 'less_than'].includes(this.state.conditionOperator);
    }

    formatInterval(ms) {
        const seconds = ms / 1000;
        const minutes = seconds / 60;
        const hours = minutes / 60;

        if (hours >= 1) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else if (minutes >= 1) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else {
            return `${seconds} second${seconds !== 1 ? 's' : ''}`;
        }
    }

    renderEditor() {
        const { children, scripts } = this.props;

        return (
            <Dialog
                open={this.state.showEditor}
                onClose={this.handleCloseEditor}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {this.state.editingMonitor ? 'Edit Polling Monitor' : 'Create Polling Monitor'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        label="Monitor Name"
                        value={this.state.name}
                        onChange={(e) => this.setState({ name: e.target.value })}
                        fullWidth
                        margin="normal"
                        required
                    />

                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Script to Run</InputLabel>
                        <Select
                            value={this.state.scriptId}
                            onChange={(e) => this.setState({ scriptId: e.target.value })}
                        >
                            {Object.values(scripts || {}).map(script => (
                                <MenuItem key={script.id} value={script.id}>
                                    {script.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Run Every</InputLabel>
                        <Select
                            value={this.state.intervalMs}
                            onChange={(e) => this.setState({ intervalMs: e.target.value })}
                        >
                            {INTERVAL_PRESETS.map(preset => (
                                <MenuItem key={preset.value} value={preset.value}>
                                    {preset.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Typography variant="subtitle2" style={{ marginTop: 16 }}>
                        JSON Response Condition
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        Script must return JSON. Specify which field to check and the condition.
                    </Typography>

                    <TextField
                        label="JSON Field to Check"
                        value={this.state.conditionField}
                        onChange={(e) => this.setState({ conditionField: e.target.value })}
                        fullWidth
                        margin="normal"
                        helperText='e.g., "active", "isConnected", "userOnline"'
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Condition</InputLabel>
                        <Select
                            value={this.state.conditionOperator}
                            onChange={(e) => this.setState({ conditionOperator: e.target.value })}
                        >
                            {CONDITION_OPERATORS.map(op => (
                                <MenuItem key={op.value} value={op.value}>
                                    {op.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {this.needsConditionValue() && (
                        <TextField
                            label="Value to Compare"
                            value={this.state.conditionValue}
                            onChange={(e) => this.setState({ conditionValue: e.target.value })}
                            fullWidth
                            margin="normal"
                        />
                    )}

                    <Box mt={2}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={this.state.reportUsage}
                                    onChange={(e) => this.setState({ reportUsage: e.target.checked })}
                                    color="primary"
                                />
                            }
                            label="Report Usage to Allow2 When Condition Met"
                        />
                    </Box>

                    {this.state.reportUsage && (
                        <>
                            <FormControl fullWidth margin="normal" required>
                                <InputLabel>Child</InputLabel>
                                <Select
                                    value={this.state.childId}
                                    onChange={(e) => this.setState({ childId: e.target.value })}
                                >
                                    {children?.map(child => (
                                        <MenuItem key={child.id} value={child.id}>
                                            {child.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth margin="normal" required>
                                <InputLabel>Activity Type</InputLabel>
                                <Select
                                    value={this.state.activityType}
                                    onChange={(e) => this.setState({ activityType: e.target.value })}
                                >
                                    {ACTIVITY_TYPES.map(type => (
                                        <MenuItem key={type} value={type}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                label="Usage Amount (per occurrence)"
                                value={this.state.usageAmount}
                                onChange={(e) => this.setState({ usageAmount: parseInt(e.target.value) || 1 })}
                                fullWidth
                                margin="normal"
                                type="number"
                                helperText="Amount of quota to deduct when condition is met"
                            />
                        </>
                    )}

                    <Box mt={2}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={this.state.enabled}
                                    onChange={(e) => this.setState({ enabled: e.target.checked })}
                                    color="primary"
                                />
                            }
                            label="Enabled"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleCloseEditor}>
                        Cancel
                    </Button>
                    <Button
                        onClick={this.handleSaveMonitor}
                        color="primary"
                        variant="contained"
                        disabled={!this.state.name || !this.state.scriptId}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    render() {
        const { monitors } = this.props;
        const monitorList = Object.values(monitors || {});

        return (
            <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                        Polling Monitors (Mode 2)
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={this.handleAddMonitor}
                    >
                        Add Monitor
                    </Button>
                </Box>

                <Typography variant="body2" color="textSecondary" paragraph>
                    Monitors run scripts on intervals, check JSON responses, and report usage to Allow2
                </Typography>

                {monitorList.length === 0 ? (
                    <Box textAlign="center" p={4}>
                        <Typography variant="body1" color="textSecondary">
                            No monitors configured
                        </Typography>
                    </Box>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Script</TableCell>
                                <TableCell>Interval</TableCell>
                                <TableCell>Condition</TableCell>
                                <TableCell>Reports Usage</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {monitorList.map(monitor => (
                                <TableRow key={monitor.id}>
                                    <TableCell>{monitor.name}</TableCell>
                                    <TableCell>{monitor.scriptConfig?.name || 'Unknown'}</TableCell>
                                    <TableCell>{this.formatInterval(monitor.intervalMs)}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {monitor.conditionField} {monitor.conditionOperator}
                                            {monitor.conditionValue ? ` ${monitor.conditionValue}` : ''}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {monitor.reportUsage ? (
                                            <Chip
                                                label={`${monitor.childName} - ${monitor.activityType}`}
                                                size="small"
                                                color="primary"
                                            />
                                        ) : (
                                            <Typography variant="body2" color="textSecondary">
                                                No
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={monitor.enabled ? 'Active' : 'Paused'}
                                            size="small"
                                            color={monitor.enabled ? 'primary' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => this.handleRunNow(monitor)}
                                            title="Run Now"
                                        >
                                            <PlayArrowIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => this.handleEditMonitor(monitor)}
                                            title="Edit"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => this.handleDeleteMonitor(monitor.id)}
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

export default PollingConfig;
