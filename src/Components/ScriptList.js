// Copyright [2021] [Allow2 Pty Ltd]
//
// Licensed under the Apache License, Version 2.0 (the "License")

'use strict';

import React, { Component } from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Chip from '@material-ui/core/Chip';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import CloudIcon from '@material-ui/icons/Cloud';
import ComputerIcon from '@material-ui/icons/Computer';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';

class ScriptList extends Component {

    handleEdit = (script) => {
        this.props.onEdit && this.props.onEdit(script);
    };

    handleDelete = (scriptId) => {
        if (window.confirm('Are you sure you want to delete this script?')) {
            this.props.onDelete && this.props.onDelete(scriptId);
        }
    };

    handleExecute = (script) => {
        this.props.onExecute && this.props.onExecute(script);
    };

    render() {
        const { scripts, remoteDevices } = this.props;
        const scriptList = Object.values(scripts || {});

        if (scriptList.length === 0) {
            return (
                <Box textAlign="center" p={4}>
                    <Typography variant="h6" color="textSecondary">
                        No Scripts Defined
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Create a script to automate actions based on Allow2 quota changes
                    </Typography>
                </Box>
            );
        }

        return (
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Remote Device</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {scriptList.map(script => {
                        const remoteDevice = script.remoteDeviceId &&
                            remoteDevices?.find(d => d.id === script.remoteDeviceId);

                        return (
                            <TableRow key={script.id}>
                                <TableCell>
                                    <Typography variant="body1">
                                        {script.name}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="textSecondary">
                                        {script.description || 'No description'}
                                    </Typography>
                                    {script.parameters && script.parameters.length > 0 && (
                                        <Box mt={1}>
                                            {script.parameters.map(param => (
                                                <Chip
                                                    key={param}
                                                    label={param}
                                                    size="small"
                                                    style={{ marginRight: 4, marginTop: 4 }}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {script.useSSH ? (
                                        <Chip
                                            icon={<CloudIcon />}
                                            label="Remote"
                                            size="small"
                                            color="primary"
                                        />
                                    ) : (
                                        <Chip
                                            icon={<ComputerIcon />}
                                            label="Local"
                                            size="small"
                                        />
                                    )}
                                </TableCell>
                                <TableCell>
                                    {remoteDevice ? (
                                        <Typography variant="body2">
                                            {remoteDevice.name}
                                        </Typography>
                                    ) : (
                                        <Typography variant="body2" color="textSecondary">
                                            -
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        size="small"
                                        onClick={() => this.handleExecute(script)}
                                        title="Execute Now"
                                    >
                                        <PlayArrowIcon />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => this.handleEdit(script)}
                                        title="Edit"
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => this.handleDelete(script.id)}
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
        );
    }
}

export default ScriptList;
