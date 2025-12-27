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

const CONDITIONS = [
    { value: 'positive_to_zero', label: 'Allowed → Blocked (time runs out)' },
    { value: 'zero_to_positive', label: 'Blocked → Allowed (time granted)' },
    { value: 'allowed_to_blocked', label: 'Permission Removed' },
    { value: 'blocked_to_allowed', label: 'Permission Granted' },
    { value: 'below_threshold', label: 'Drops Below Threshold' },
    { value: 'above_threshold', label: 'Rises Above Threshold' }
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

class TriggerConfig extends Component {

    constructor(props) {
        super(props);

        this.state = {
            showEditor: false,
            editingTrigger: null,
            name: '',
            childId: '',
            activityType: 'gaming',
            condition: 'positive_to_zero',
            threshold: 300,
            scriptId: '',
            enabled: true
        };
    }

    handleAddTrigger = () => {
        this.setState({
            showEditor: true,
            editingTrigger: null,
            name: '',
            childId: '',
            activityType: 'gaming',
            condition: 'positive_to_zero',
            threshold: 300,
            scriptId: '',
            enabled: true
        });
    };

    handleEditTrigger = (trigger) => {
        this.setState({
            showEditor: true,
            editingTrigger: trigger,
            name: trigger.name,
            childId: trigger.childId,
            activityType: trigger.activityType,
            condition: trigger.condition,
            threshold: trigger.threshold || 300,
            scriptId: trigger.scriptId,
            enabled: trigger.enabled
        });
    };

    handleSaveTrigger = () => {
        const child = this.props.children && this.props.children[this.state.childId];

        const trigger = {
            id: this.state.editingTrigger?.id || `trigger-${Date.now()}`,
            name: this.state.name,
            childId: this.state.childId,
            childName: child?.name || 'Unknown',
            activityType: this.state.activityType,
            condition: this.state.condition,
            threshold: this.state.threshold,
            scriptId: this.state.scriptId,
            enabled: this.state.enabled,
            updatedAt: Date.now()
        };

        this.props.onSave && this.props.onSave(trigger);
        this.handleCloseEditor();
    };

    handleDeleteTrigger = (triggerId) => {
        if (window.confirm('Are you sure you want to delete this trigger?')) {
            this.props.onDelete && this.props.onDelete(triggerId);
        }
    };

    handleCloseEditor = () => {
        this.setState({ showEditor: false });
    };

    needsThreshold() {
        return ['below_threshold', 'above_threshold'].includes(this.state.condition);
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
                    {this.state.editingTrigger ? 'Edit Trigger' : 'Create Trigger'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        label="Trigger Name"
                        value={this.state.name}
                        onChange={(e) => this.setState({ name: e.target.value })}
                        fullWidth
                        margin="normal"
                        required
                        helperText="Descriptive name for this trigger"
                    />

                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Child</InputLabel>
                        <Select
                            value={this.state.childId}
                            onChange={(e) => this.setState({ childId: e.target.value })}
                        >
                            {children && Object.values(children).map(child => (
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

                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Condition</InputLabel>
                        <Select
                            value={this.state.condition}
                            onChange={(e) => this.setState({ condition: e.target.value })}
                        >
                            {CONDITIONS.map(cond => (
                                <MenuItem key={cond.value} value={cond.value}>
                                    {cond.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {this.needsThreshold() && (
                        <TextField
                            label="Threshold (seconds)"
                            value={this.state.threshold}
                            onChange={(e) => this.setState({ threshold: parseInt(e.target.value) || 0 })}
                            fullWidth
                            margin="normal"
                            type="number"
                            helperText="Trigger when quota crosses this threshold"
                        />
                    )}

                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Script to Execute</InputLabel>
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
                        onClick={this.handleSaveTrigger}
                        color="primary"
                        variant="contained"
                        disabled={!this.state.name || !this.state.childId || !this.state.scriptId}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    render() {
        const { triggers, scripts } = this.props;
        const triggerList = Object.values(triggers || {});

        return (
            <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                        Event Triggers (Mode 1)
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={this.handleAddTrigger}
                    >
                        Add Trigger
                    </Button>
                </Box>

                <Typography variant="body2" color="textSecondary" paragraph>
                    Triggers execute scripts when Allow2 quota states change (e.g., gaming time runs out)
                </Typography>

                {triggerList.length === 0 ? (
                    <Box textAlign="center" p={4}>
                        <Typography variant="body1" color="textSecondary">
                            No triggers configured
                        </Typography>
                    </Box>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Child</TableCell>
                                <TableCell>Activity</TableCell>
                                <TableCell>Condition</TableCell>
                                <TableCell>Script</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {triggerList.map(trigger => {
                                const script = scripts?.[trigger.scriptId];
                                const conditionLabel = CONDITIONS.find(c => c.value === trigger.condition)?.label;

                                return (
                                    <TableRow key={trigger.id}>
                                        <TableCell>{trigger.name}</TableCell>
                                        <TableCell>{trigger.childName}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={trigger.activityType}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {conditionLabel}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {script?.name || 'Unknown'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={trigger.enabled ? 'Enabled' : 'Disabled'}
                                                size="small"
                                                color={trigger.enabled ? 'primary' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton
                                                size="small"
                                                onClick={() => this.handleEditTrigger(trigger)}
                                                title="Edit"
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => this.handleDeleteTrigger(trigger.id)}
                                                title="Delete"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}

                {this.renderEditor()}
            </Box>
        );
    }
}

export default TriggerConfig;
