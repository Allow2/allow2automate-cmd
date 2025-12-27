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

/**
 * PollingMonitor - Mode 2: Scheduled Script Execution
 * Runs scripts on intervals, parses JSON responses, and reports usage to Allow2
 */
export default class PollingMonitor {

    constructor(listener, scriptManager, allow2Context) {
        this.listener = listener;
        this.scriptManager = scriptManager;
        this.allow2 = allow2Context;
        this.monitors = {}; // Active polling monitors
        this.intervals = {}; // Interval timers
    }

    /**
     * Add a polling monitor
     * @param {object} monitor - Monitor configuration
     */
    addMonitor(monitor) {
        this.monitors[monitor.id] = {
            ...monitor,
            enabled: true,
            lastRun: null,
            runCount: 0,
            errorCount: 0
        };

        if (monitor.enabled) {
            this.startMonitor(monitor.id);
        }

        console.log(`PollingMonitor: Added monitor ${monitor.id}`, monitor);
    }

    /**
     * Remove a polling monitor
     * @param {string} monitorId - Monitor ID
     */
    removeMonitor(monitorId) {
        this.stopMonitor(monitorId);
        delete this.monitors[monitorId];
        console.log(`PollingMonitor: Removed monitor ${monitorId}`);
    }

    /**
     * Update monitor configuration
     * @param {string} monitorId - Monitor ID
     * @param {object} updates - Updated fields
     */
    updateMonitor(monitorId, updates) {
        if (this.monitors[monitorId]) {
            const wasEnabled = this.monitors[monitorId].enabled;
            const intervalChanged = updates.intervalMs &&
                updates.intervalMs !== this.monitors[monitorId].intervalMs;

            this.monitors[monitorId] = {
                ...this.monitors[monitorId],
                ...updates
            };

            // Restart if interval changed or enable status changed
            if (intervalChanged || (wasEnabled !== updates.enabled)) {
                this.stopMonitor(monitorId);
                if (updates.enabled) {
                    this.startMonitor(monitorId);
                }
            }
        }
    }

    /**
     * Get all monitors
     * @returns {array} - Array of monitors
     */
    getMonitors() {
        return Object.values(this.monitors);
    }

    /**
     * Start a specific monitor
     * @param {string} monitorId - Monitor ID
     */
    startMonitor(monitorId) {
        const monitor = this.monitors[monitorId];
        if (!monitor) {
            console.error(`PollingMonitor: Monitor ${monitorId} not found`);
            return;
        }

        if (this.intervals[monitorId]) {
            console.warn(`PollingMonitor: Monitor ${monitorId} already running`);
            return;
        }

        console.log(`PollingMonitor: Starting monitor ${monitorId} with interval ${monitor.intervalMs}ms`);

        // Run immediately, then on interval
        this.runMonitor(monitorId);

        this.intervals[monitorId] = setInterval(
            () => this.runMonitor(monitorId),
            monitor.intervalMs
        );
    }

    /**
     * Stop a specific monitor
     * @param {string} monitorId - Monitor ID
     */
    stopMonitor(monitorId) {
        if (this.intervals[monitorId]) {
            clearInterval(this.intervals[monitorId]);
            delete this.intervals[monitorId];
            console.log(`PollingMonitor: Stopped monitor ${monitorId}`);
        }
    }

    /**
     * Run a monitor (execute script and process result)
     * @param {string} monitorId - Monitor ID
     */
    async runMonitor(monitorId) {
        const monitor = this.monitors[monitorId];
        if (!monitor || !monitor.enabled) {
            return;
        }

        try {
            console.log(`PollingMonitor: Running monitor ${monitorId}`);

            monitor.lastRun = Date.now();
            monitor.runCount++;

            // Execute the script
            const result = await this.scriptManager.execute(
                monitor.scriptConfig,
                monitor.params || {}
            );

            // Parse JSON response
            const parsed = this.scriptManager.parseJSONResponse(result.stdout);

            if (!parsed.success) {
                throw new Error(parsed.error);
            }

            // Process the result
            await this.processResult(monitor, parsed.data);

            // Notify listener
            this.listener?.onMonitorRun?.({
                monitorId,
                monitor,
                result: parsed.data,
                success: true
            });

        } catch (error) {
            monitor.errorCount++;
            console.error(`PollingMonitor: Error running monitor ${monitorId}:`, error);

            this.listener?.onMonitorError?.({
                monitorId,
                monitor,
                error: error.message,
                type: 'execution'
            });
        }
    }

    /**
     * Process script result and report usage if needed
     * @param {object} monitor - Monitor config
     * @param {object} data - Parsed JSON data from script
     */
    async processResult(monitor, data) {
        try {
            // Check if condition is met based on monitor configuration
            const conditionMet = this.evaluateCondition(monitor, data);

            if (conditionMet) {
                console.log(`PollingMonitor: Condition met for ${monitor.id}`, data);

                // Report usage to Allow2
                if (monitor.reportUsage) {
                    await this.reportUsage(
                        monitor.childId,
                        monitor.activityType,
                        monitor.usageAmount || 1,
                        data
                    );
                }

                // Notify listener
                this.listener?.onConditionMet?.({
                    monitorId: monitor.id,
                    monitor,
                    data,
                    reported: monitor.reportUsage
                });
            }

        } catch (error) {
            console.error('PollingMonitor: Error processing result:', error);
            throw error;
        }
    }

    /**
     * Evaluate if condition is met from script data
     * @param {object} monitor - Monitor config
     * @param {object} data - Script result data
     * @returns {boolean} - Condition met
     */
    evaluateCondition(monitor, data) {
        // Simple condition evaluation
        // Can be extended to support complex conditions

        if (monitor.conditionField) {
            const value = data[monitor.conditionField];

            switch (monitor.conditionOperator) {
                case 'equals':
                    return value === monitor.conditionValue;
                case 'not_equals':
                    return value !== monitor.conditionValue;
                case 'greater_than':
                    return value > monitor.conditionValue;
                case 'less_than':
                    return value < monitor.conditionValue;
                case 'truthy':
                    return !!value;
                case 'falsy':
                    return !value;
                default:
                    return !!value;
            }
        }

        // Default: check for 'active', 'enabled', or 'condition' field
        return !!(data.active || data.enabled || data.condition || data.shouldReport);
    }

    /**
     * Report usage to Allow2 API
     * @param {string} childId - Child ID
     * @param {string} activityType - Activity type
     * @param {number} amount - Usage amount
     * @param {object} metadata - Additional metadata
     */
    async reportUsage(childId, activityType, amount, metadata) {
        try {
            console.log(`PollingMonitor: Reporting usage for child ${childId}, activity ${activityType}, amount ${amount}`);

            // Use Allow2 context to report usage
            await this.allow2.log({
                childId,
                activity: activityType,
                amount: amount || 1,
                meta: {
                    source: 'allow2automate-cmd',
                    monitor: true,
                    ...metadata
                }
            });

            console.log('PollingMonitor: Usage reported successfully');

        } catch (error) {
            console.error('PollingMonitor: Error reporting usage:', error);
            throw error;
        }
    }

    /**
     * Start all enabled monitors
     */
    startAll() {
        Object.keys(this.monitors).forEach(monitorId => {
            if (this.monitors[monitorId].enabled) {
                this.startMonitor(monitorId);
            }
        });
    }

    /**
     * Stop all monitors
     */
    stopAll() {
        Object.keys(this.intervals).forEach(monitorId => {
            this.stopMonitor(monitorId);
        });
    }

    /**
     * Get monitor status
     * @param {string} monitorId - Monitor ID
     * @returns {object} - Monitor status
     */
    getStatus(monitorId) {
        const monitor = this.monitors[monitorId];
        if (!monitor) {
            return null;
        }

        return {
            id: monitorId,
            enabled: monitor.enabled,
            running: !!this.intervals[monitorId],
            lastRun: monitor.lastRun,
            runCount: monitor.runCount,
            errorCount: monitor.errorCount,
            nextRun: monitor.lastRun ?
                monitor.lastRun + monitor.intervalMs :
                Date.now()
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopAll();
        this.monitors = {};
        this.intervals = {};
    }
}
