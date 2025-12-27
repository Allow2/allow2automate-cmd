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

import axios from 'axios';

/**
 * StateMonitor - Mode 1: Event-Driven State Change Monitoring
 * Polls Allow2 API to detect quota state transitions and trigger scripts
 */
export default class StateMonitor {

    constructor(listener, allow2Context) {
        this.listener = listener;
        this.allow2 = allow2Context;
        this.triggers = {}; // Active triggers
        this.previousStates = {}; // Track previous quota states
        this.pollInterval = null;
        this.pollIntervalMs = 30000; // Poll every 30 seconds
    }

    /**
     * Start monitoring for state changes
     */
    start() {
        if (this.pollInterval) {
            return; // Already running
        }

        console.log('StateMonitor: Starting state monitoring');
        this.pollInterval = setInterval(
            this.checkStateChanges.bind(this),
            this.pollIntervalMs
        );

        // Initial check
        this.checkStateChanges();
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
            console.log('StateMonitor: Stopped state monitoring');
        }
    }

    /**
     * Add a trigger to monitor
     * @param {object} trigger - Trigger configuration
     */
    addTrigger(trigger) {
        this.triggers[trigger.id] = {
            ...trigger,
            enabled: true,
            lastTriggered: null
        };
        console.log(`StateMonitor: Added trigger ${trigger.id}`, trigger);
    }

    /**
     * Remove a trigger
     * @param {string} triggerId - Trigger ID to remove
     */
    removeTrigger(triggerId) {
        delete this.triggers[triggerId];
        console.log(`StateMonitor: Removed trigger ${triggerId}`);
    }

    /**
     * Update trigger configuration
     * @param {string} triggerId - Trigger ID
     * @param {object} updates - Updated fields
     */
    updateTrigger(triggerId, updates) {
        if (this.triggers[triggerId]) {
            this.triggers[triggerId] = {
                ...this.triggers[triggerId],
                ...updates
            };
        }
    }

    /**
     * Get all active triggers
     * @returns {array} - Array of triggers
     */
    getTriggers() {
        return Object.values(this.triggers);
    }

    /**
     * Check for state changes across all triggers
     */
    async checkStateChanges() {
        try {
            for (const trigger of Object.values(this.triggers)) {
                if (!trigger.enabled) {
                    continue;
                }

                await this.checkTrigger(trigger);
            }
        } catch (error) {
            console.error('StateMonitor: Error checking state changes:', error);
            this.listener?.onMonitorError?.({
                error: error.message,
                type: 'state_check'
            });
        }
    }

    /**
     * Check a specific trigger for state changes
     * @param {object} trigger - Trigger configuration
     */
    async checkTrigger(trigger) {
        try {
            const currentState = await this.getQuotaState(
                trigger.childId,
                trigger.activityType
            );

            const stateKey = `${trigger.childId}:${trigger.activityType}`;
            const previousState = this.previousStates[stateKey];

            // Store current state for next comparison
            this.previousStates[stateKey] = currentState;

            // Check if trigger condition is met
            if (previousState && this.shouldTrigger(trigger, previousState, currentState)) {
                await this.executeTrigger(trigger, previousState, currentState);
            }

        } catch (error) {
            console.error(`StateMonitor: Error checking trigger ${trigger.id}:`, error);
        }
    }

    /**
     * Get quota state from Allow2 API
     * @param {string} childId - Child ID
     * @param {string} activityType - Activity type
     * @returns {object} - Quota state
     */
    async getQuotaState(childId, activityType) {
        try {
            // Use Allow2 context to check quota
            // This is a simplified example - actual implementation depends on Allow2 API
            const quota = await this.allow2.check({
                childId,
                activities: [activityType]
            });

            return {
                remaining: quota?.activities?.[activityType]?.remaining || 0,
                allowed: quota?.activities?.[activityType]?.allowed || false,
                unlimited: quota?.activities?.[activityType]?.unlimited || false,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('StateMonitor: Error fetching quota state:', error);
            throw error;
        }
    }

    /**
     * Determine if trigger should fire
     * @param {object} trigger - Trigger config
     * @param {object} previousState - Previous quota state
     * @param {object} currentState - Current quota state
     * @returns {boolean} - Should trigger
     */
    shouldTrigger(trigger, previousState, currentState) {
        switch (trigger.condition) {
            case 'positive_to_zero':
                return previousState.remaining > 0 && currentState.remaining <= 0;

            case 'zero_to_positive':
                return previousState.remaining <= 0 && currentState.remaining > 0;

            case 'allowed_to_blocked':
                return previousState.allowed && !currentState.allowed;

            case 'blocked_to_allowed':
                return !previousState.allowed && currentState.allowed;

            case 'below_threshold':
                return (
                    previousState.remaining > trigger.threshold &&
                    currentState.remaining <= trigger.threshold
                );

            case 'above_threshold':
                return (
                    previousState.remaining <= trigger.threshold &&
                    currentState.remaining > trigger.threshold
                );

            default:
                return false;
        }
    }

    /**
     * Execute trigger action
     * @param {object} trigger - Trigger config
     * @param {object} previousState - Previous state
     * @param {object} currentState - Current state
     */
    async executeTrigger(trigger, previousState, currentState) {
        console.log(`StateMonitor: Trigger ${trigger.id} fired`, {
            condition: trigger.condition,
            previous: previousState,
            current: currentState
        });

        // Update last triggered time
        this.triggers[trigger.id].lastTriggered = Date.now();

        // Notify listener to execute script
        this.listener?.onTriggerFired?.({
            triggerId: trigger.id,
            trigger,
            previousState,
            currentState,
            params: {
                childId: trigger.childId,
                childName: trigger.childName,
                activityType: trigger.activityType,
                previousRemaining: previousState.remaining,
                currentRemaining: currentState.remaining,
                wasAllowed: previousState.allowed,
                isAllowed: currentState.allowed,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Set polling interval
     * @param {number} intervalMs - Interval in milliseconds
     */
    setPollInterval(intervalMs) {
        this.pollIntervalMs = intervalMs;

        if (this.pollInterval) {
            this.stop();
            this.start();
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stop();
        this.triggers = {};
        this.previousStates = {};
    }
}
