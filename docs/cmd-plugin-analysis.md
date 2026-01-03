# CMD Plugin Architecture Analysis

**Plugin**: `@allow2/allow2automate-cmd`
**Version**: 1.0.0
**Purpose**: Execute local and remote commands/scripts triggered by Allow2 state changes or scheduled intervals
**Analysis Date**: 2025-12-28

---

## Table of Contents

1. [Dependencies](#dependencies)
2. [Plugin Exports and Lifecycle](#plugin-exports-and-lifecycle)
3. [IPC Handlers for Command Execution](#ipc-handlers-for-command-execution)
4. [Process Control Mechanisms](#process-control-mechanisms)
5. [Configuration for Custom Commands](#configuration-for-custom-commands)
6. [Process Status Monitoring](#process-status-monitoring)
7. [Key Question: External Process Execution](#key-question-external-process-execution)

---

## Dependencies

### Production Dependencies

```json
{
  "@babel/runtime": "^7.13.9",    // Babel runtime helpers for transpiled code
  "axios": "^0.27.2",             // HTTP client (currently unused in core logic)
  "mustache": "^4.2.0",           // Template engine for parameter substitution
  "ssh2": "^1.11.0"               // SSH2 client for remote script execution
}
```

### Peer Dependencies (UI Components)

```json
{
  "@material-ui/core": "^4.0.0",
  "@material-ui/icons": "^4.0.0",
  "react": "^16.0.0 || ^17.0.0",
  "react-dom": "^16.0.0 || ^17.0.0"
}
```

### Key Dependency Usage

- **mustache**: Parameter substitution in scripts (e.g., `{{childName}}`, `{{quotaRemaining}}`)
- **ssh2**: Remote command execution via SSH protocol
- **child_process** (Node.js built-in): Local script execution via `spawn()` and `exec()`

---

## Plugin Exports and Lifecycle

### Main Export Structure

**File**: `/src/index.js`

```javascript
module.exports = {
    plugin,      // Main plugin function
    TabContent   // React UI component
};
```

### Plugin Lifecycle Hooks

The plugin implements the following lifecycle methods:

#### 1. `onLoad(loadState)`

**Purpose**: Initialize plugin when Allow2Automate loads
**File**: `/src/index.js:33`

```javascript
cmd.onLoad = function(loadState) {
    // Initialize persisted state
    state = loadState || {
        scripts: {},
        triggers: {},
        monitors: {},
        sshConfigs: {}
    };

    // Initialize managers
    scriptManager = new ScriptManager({ ... });
    stateMonitor = new StateMonitor({ ... });
    pollingMonitor = new PollingMonitor({ ... });

    // Load saved triggers and monitors
    Object.values(state.triggers).forEach(trigger =>
        stateMonitor.addTrigger(trigger)
    );
    Object.values(state.monitors).forEach(monitor =>
        pollingMonitor.addMonitor(monitor)
    );

    // Start monitoring
    stateMonitor.start();
    pollingMonitor.startAll();

    // Setup IPC handlers
    setupIPCHandlers(context);
};
```

**Key Actions**:
- Restores persisted state (scripts, triggers, monitors, SSH configs)
- Instantiates three core managers: `ScriptManager`, `StateMonitor`, `PollingMonitor`
- Registers saved triggers with state monitor
- Registers saved polling monitors
- Starts both monitoring systems
- Sets up IPC communication channels

#### 2. `newState(newState)`

**Purpose**: Update internal state when persisted configuration changes
**File**: `/src/index.js:131`

```javascript
cmd.newState = function(newState) {
    state = newState;
    console.log('cmd.newState', newState);
};
```

**Note**: Simple state update, no restart logic (could be improved for dynamic updates)

#### 3. `onSetEnabled(enabled)`

**Purpose**: Handle plugin enable/disable
**File**: `/src/index.js:139`

```javascript
cmd.onSetEnabled = function(enabled) {
    if (enabled) {
        stateMonitor?.start();
        pollingMonitor?.startAll();
    } else {
        stateMonitor?.stop();
        pollingMonitor?.stopAll();
    }
};
```

**Behavior**:
- When enabled: Starts state monitoring (30s polling) and all active polling monitors
- When disabled: Stops all monitoring and polling activities

#### 4. `onUnload(callback)`

**Purpose**: Cleanup before plugin deletion
**File**: `/src/index.js:154`

```javascript
cmd.onUnload = function(callback) {
    scriptManager?.cleanup();    // Close SSH connections
    stateMonitor?.cleanup();     // Clear intervals, reset state
    pollingMonitor?.cleanup();   // Clear all monitor intervals
    callback(null);
};
```

**Cleanup Actions**:
- Closes cached SSH connections
- Clears all `setInterval` timers
- Resets internal state objects

---

## IPC Handlers for Command Execution

**File**: `/src/index.js:168-309`

The plugin uses Electron's `ipcMain.handle()` for bidirectional communication with the renderer process.

### Script Management Handlers

| Handler | Purpose | Returns |
|---------|---------|---------|
| `saveScript` | Save/update script configuration | `[error, { success, script }]` |
| `deleteScript` | Remove script from state | `[error, { success }]` |
| `executeScript` | Run script manually with params | `[error, result]` |
| `testSSH` | Validate SSH connection | `[error, result]` |
| `saveSSHConfig` | Save remote device credentials | `[error, { success, config }]` |

#### Example: `executeScript` Handler

```javascript
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
```

**Flow**:
1. Renderer requests script execution via IPC
2. Main process retrieves script from state
3. ScriptManager executes (local or SSH)
4. Result returned to renderer

### Trigger Management Handlers

| Handler | Purpose | Updates |
|---------|---------|---------|
| `addTrigger` | Create event-driven trigger | State + StateMonitor |
| `updateTrigger` | Modify trigger configuration | State + StateMonitor |
| `removeTrigger` | Delete trigger | State + StateMonitor |

**Key Pattern**: All trigger operations immediately update both persisted state AND the running StateMonitor instance.

### Monitor Management Handlers

| Handler | Purpose | Updates |
|---------|---------|---------|
| `addMonitor` | Create polling monitor | State + PollingMonitor |
| `updateMonitor` | Modify monitor configuration | State + PollingMonitor |
| `removeMonitor` | Delete monitor | State + PollingMonitor |
| `getMonitorStatus` | Check monitor execution status | Read-only |

**Dynamic Updates**: Adding/updating monitors automatically starts/restarts interval timers.

---

## Process Control Mechanisms

### Core Class: `ScriptManager`

**File**: `/src/ScriptManager.js`

The ScriptManager handles both local and remote process execution with comprehensive control mechanisms.

### Local Process Execution

**Method**: `executeLocal(script, params, options)`
**File**: `/src/ScriptManager.js:50-119`

#### Process Spawning

```javascript
const shell = options.shell || (process.platform === 'win32' ? 'cmd.exe' : '/bin/bash');
const shellFlag = process.platform === 'win32' ? '/c' : '-c';

const child = spawn(shell, [shellFlag, renderedScript], {
    cwd: options.cwd || process.cwd(),
    env: { ...process.env, ...options.env },
    timeout: options.timeout || 30000
});
```

**Platform Detection**:
- **Windows**: Uses `cmd.exe /c <script>`
- **Unix/Linux/Mac**: Uses `/bin/bash -c <script>`

#### Process Control Features

1. **Timeout Control**: Default 30 seconds, configurable per script
2. **Working Directory**: Customizable `cwd` option
3. **Environment Variables**: Merges custom env vars with system env
4. **Stream Handling**: Separate stdout/stderr capture

#### Process Monitoring

```javascript
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

    this.listener?.onScriptComplete?.({ ... });

    if (code === 0) {
        resolve(result);
    } else {
        reject(new Error(`Script exited with code ${code}: ${stderr}`));
    }
});

child.on('error', (error) => {
    this.listener?.onScriptError?.({ ... });
    reject(error);
});
```

**Event Handling**:
- **data**: Real-time output streaming to UI
- **close**: Exit code handling, success/failure determination
- **error**: Process spawn failures (e.g., command not found)

### SSH Process Execution

**Method**: `executeSSH(script, params, sshConfig, options)`
**File**: `/src/ScriptManager.js:129-217`

#### SSH Connection Flow

```javascript
const conn = new SSHClient();

conn.on('ready', () => {
    conn.exec(renderedScript, (err, stream) => {
        if (err) {
            conn.end();
            return reject(err);
        }

        stream.on('close', (code, signal) => {
            conn.end();
            // Handle result
        });

        stream.on('data', (data) => {
            // Capture stdout
        });

        stream.stderr.on('data', (data) => {
            // Capture stderr
        });
    });
});

conn.on('error', (err) => {
    // Handle connection failure
    reject(err);
});

conn.connect({
    host: sshConfig.host,
    port: sshConfig.port || 22,
    username: sshConfig.username,
    password: sshConfig.password,
    privateKey: sshConfig.privateKey,
    passphrase: sshConfig.passphrase,
    readyTimeout: options.timeout || 30000
});
```

#### SSH Authentication Methods

**Supported Modes**:
1. **Password Authentication**: `username` + `password`
2. **SSH Key Authentication**: `username` + `privateKey` (+ optional `passphrase`)

#### SSH Process Control

- **Connection Timeout**: `readyTimeout` (default 30s)
- **Command Execution**: Remote shell executes full script
- **Stream Handling**: SSH stream provides stdout/stderr separation
- **Exit Codes**: Signal-based exit code detection
- **Connection Lifecycle**: Opens connection → executes → closes immediately

### Parameter Substitution

**Method**: `substituteParameters(script, params)`
**File**: `/src/ScriptManager.js:34-41`

```javascript
substituteParameters(script, params) {
    try {
        return Mustache.render(script, params);
    } catch (error) {
        console.error('Parameter substitution error:', error);
        throw new Error(`Failed to substitute parameters: ${error.message}`);
    }
}
```

**Template Syntax**: Mustache-based (`{{paramName}}`)

**Example**:
```bash
# Script template
shutdown /s /t {{shutdownDelay}} /c "{{message}}"

# Parameters
{
  shutdownDelay: 60,
  message: "Screen time expired"
}

# Rendered
shutdown /s /t 60 /c "Screen time expired"
```

**Security**: Mustache automatically escapes HTML but not shell metacharacters. Scripts should validate parameters if using user input.

---

## Configuration for Custom Commands

### Script Configuration Structure

**State Key**: `state.scripts[scriptId]`

```javascript
{
  id: string,                    // UUID
  name: string,                  // Display name
  description: string,           // Optional description
  script: string,                // Multi-line script content
  useSSH: boolean,               // Execute remotely?
  sshConfig: {                   // Only if useSSH=true
    host: string,
    port: number,
    username: string,
    password?: string,
    privateKey?: string,
    passphrase?: string
  },
  timeout: number,               // Milliseconds (default 30000)
  workingDir: string,            // Working directory (local only)
  env: { [key: string]: string }, // Environment variables
  parameters: string[],          // Custom parameter names
  updatedAt: number              // Timestamp
}
```

### Trigger Configuration (Mode 1: Event-Driven)

**State Key**: `state.triggers[triggerId]`

```javascript
{
  id: string,
  name: string,
  childId: string,               // Allow2 child ID
  childName: string,
  activityType: string,          // 'gaming', 'internet', 'screen'
  condition: TriggerCondition,   // See below
  threshold?: number,            // Required for threshold conditions
  scriptId: string,              // Script to execute
  enabled: boolean,
  lastTriggered?: number
}
```

**Trigger Conditions** (`StateMonitor.js:190-218`):

| Condition | Description | Logic |
|-----------|-------------|-------|
| `positive_to_zero` | Quota depletes | `previous > 0 && current <= 0` |
| `zero_to_positive` | Quota granted | `previous <= 0 && current > 0` |
| `allowed_to_blocked` | Permission removed | `previous.allowed && !current.allowed` |
| `blocked_to_allowed` | Permission granted | `!previous.allowed && current.allowed` |
| `below_threshold` | Drops below value | `previous > threshold && current <= threshold` |
| `above_threshold` | Rises above value | `previous <= threshold && current > threshold` |

### Monitor Configuration (Mode 2: Polling)

**State Key**: `state.monitors[monitorId]`

```javascript
{
  id: string,
  name: string,
  scriptConfig: Script,          // Full script object
  intervalMs: number,            // Poll interval (e.g., 60000 = 1min)
  conditionField: string,        // JSON field to evaluate
  conditionOperator: Operator,   // See below
  conditionValue?: any,          // Comparison value
  reportUsage: boolean,          // Report to Allow2?
  childId?: string,              // Required if reportUsage=true
  childName?: string,
  activityType?: string,         // Activity to report
  usageAmount?: number,          // Quota to deduct (default 1)
  enabled: boolean,
  lastRun?: number,
  runCount: number,
  errorCount: number
}
```

**Condition Operators** (`PollingMonitor.js:230-258`):

| Operator | Logic |
|----------|-------|
| `truthy` | `!!value` |
| `falsy` | `!value` |
| `equals` | `value === conditionValue` |
| `not_equals` | `value !== conditionValue` |
| `greater_than` | `value > conditionValue` |
| `less_than` | `value < conditionValue` |

**JSON Response Format**:
```json
{
  "active": true,
  "username": "alice",
  "connectionTime": 3600,
  "nested": {
    "field": "value"
  }
}
```

**Nested Field Support**: `conditionField: "nested.field"` (implementation depends on parsing logic)

---

## Process Status Monitoring

### StateMonitor: Event-Driven Monitoring

**File**: `/src/StateMonitor.js`

#### Monitoring Loop

```javascript
start() {
    this.pollInterval = setInterval(
        this.checkStateChanges.bind(this),
        this.pollIntervalMs  // Default: 30000ms (30 seconds)
    );

    this.checkStateChanges(); // Immediate first check
}
```

**Polling Frequency**: 30 seconds (configurable via `setPollInterval()`)

#### State Change Detection

```javascript
async checkStateChanges() {
    for (const trigger of Object.values(this.triggers)) {
        if (!trigger.enabled) continue;

        const currentState = await this.getQuotaState(
            trigger.childId,
            trigger.activityType
        );

        const stateKey = `${trigger.childId}:${trigger.activityType}`;
        const previousState = this.previousStates[stateKey];

        // Store current for next comparison
        this.previousStates[stateKey] = currentState;

        // Check condition
        if (previousState && this.shouldTrigger(trigger, previousState, currentState)) {
            await this.executeTrigger(trigger, previousState, currentState);
        }
    }
}
```

**State Tracking**:
- Maintains `previousStates` map keyed by `childId:activityType`
- Compares current quota state with previous on each poll
- Fires trigger only when condition transitions (edge detection)

#### Quota State Structure

```javascript
{
  remaining: number,      // Quota remaining (seconds)
  allowed: boolean,       // Permission status
  unlimited: boolean,     // Unlimited quota flag
  timestamp: number       // State capture time
}
```

### PollingMonitor: Scheduled Execution

**File**: `/src/PollingMonitor.js`

#### Monitor Execution Loop

```javascript
startMonitor(monitorId) {
    const monitor = this.monitors[monitorId];

    // Run immediately
    this.runMonitor(monitorId);

    // Schedule recurring execution
    this.intervals[monitorId] = setInterval(
        () => this.runMonitor(monitorId),
        monitor.intervalMs
    );
}
```

**Interval Ranges**: Configurable per monitor (common: 60000ms to 3600000ms)

#### Monitor Execution Flow

```javascript
async runMonitor(monitorId) {
    const monitor = this.monitors[monitorId];

    monitor.lastRun = Date.now();
    monitor.runCount++;

    try {
        // Execute script
        const result = await this.scriptManager.execute(
            monitor.scriptConfig,
            monitor.params || {}
        );

        // Parse JSON response
        const parsed = this.scriptManager.parseJSONResponse(result.stdout);

        if (!parsed.success) {
            throw new Error(parsed.error);
        }

        // Evaluate condition
        await this.processResult(monitor, parsed.data);

        this.listener?.onMonitorRun?.({ ... });

    } catch (error) {
        monitor.errorCount++;
        this.listener?.onMonitorError?.({ ... });
    }
}
```

**Execution Metrics**:
- `lastRun`: Timestamp of last execution
- `runCount`: Total successful runs
- `errorCount`: Total failures

#### Usage Reporting

```javascript
async reportUsage(childId, activityType, amount, metadata) {
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
}
```

**Trigger**: Called when monitor condition evaluates to `true`

---

## Key Question: External Process Execution

### How does it execute external processes?

#### Local Execution Path

1. **User Action**: Trigger fires OR polling monitor runs OR manual execution via UI
2. **Parameter Substitution**: Mustache replaces `{{params}}` in script template
3. **Process Spawn**: Node.js `child_process.spawn()` creates shell process
   ```javascript
   spawn('/bin/bash', ['-c', renderedScript], {
       cwd: workingDir,
       env: environmentVars,
       timeout: 30000
   })
   ```
4. **Stream Monitoring**: stdout/stderr events captured in real-time
5. **Exit Handling**: `close` event processes exit code
6. **Result Delivery**: IPC sends result to renderer + triggers next actions

#### SSH Execution Path

1. **User Action**: Same triggers as local
2. **Parameter Substitution**: Same Mustache rendering
3. **SSH Connection**: `ssh2` library establishes connection
   ```javascript
   conn.connect({
       host: '192.168.1.1',
       port: 22,
       username: 'admin',
       privateKey: fs.readFileSync('/path/to/key')
   })
   ```
4. **Remote Execution**: `conn.exec(script)` sends command to remote shell
5. **Stream Capture**: SSH stream provides stdout/stderr
6. **Connection Cleanup**: Connection closed immediately after execution
7. **Result Delivery**: Same as local execution

### How does it monitor process status?

#### Real-Time Monitoring

**Stream Events**:
```javascript
// Continuous output capture
child.stdout.on('data', (data) => {
    // Send to UI immediately
    context.sendToRenderer('scriptOutput', {
        type: 'stdout',
        data
    });
});
```

**Exit Monitoring**:
```javascript
child.on('close', (code) => {
    // Determines success/failure
    const success = code === 0;

    // Triggers downstream actions:
    // - Update UI status
    // - Fire completion callbacks
    // - Log to history
    // - Report metrics
});
```

#### Periodic State Checks

**StateMonitor**:
- Polls Allow2 API every 30 seconds
- Compares quota states (current vs. previous)
- Detects state transitions (e.g., allowed → blocked)
- Executes associated scripts on condition match

**PollingMonitor**:
- Runs scripts on configured intervals (e.g., every 60 seconds)
- Parses JSON responses from script output
- Evaluates conditions against response fields
- Reports usage to Allow2 API when conditions met

### Process Control Features

| Feature | Local | SSH | Implementation |
|---------|-------|-----|----------------|
| **Timeout** | ✅ | ✅ | `spawn()` timeout option / SSH `readyTimeout` |
| **Kill Signal** | ❌ | ❌ | No explicit kill mechanism exposed |
| **Working Directory** | ✅ | ❌ | `spawn()` cwd option |
| **Environment Variables** | ✅ | ❌ | `spawn()` env option |
| **Platform Detection** | ✅ | N/A | Windows: cmd.exe, Unix: bash |
| **Output Streaming** | ✅ | ✅ | Real-time stdout/stderr events |
| **Error Handling** | ✅ | ✅ | Error events + exit code checking |
| **Connection Pooling** | N/A | ❌ | SSH connections not reused |

### Security Considerations

1. **Credential Storage**: SSH passwords/keys stored in encrypted Electron storage
2. **Command Injection**: Mustache templating prevents direct shell injection
3. **Privilege Escalation**: Scripts run with same permissions as Allow2Automate process
4. **Timeout Protection**: Prevents infinite script execution
5. **Audit Trail**: Logs all script executions with timestamps

---

## Architecture Summary

### Component Hierarchy

```
index.js (Plugin Main)
├── ScriptManager
│   ├── executeLocal() → child_process.spawn()
│   └── executeSSH() → ssh2.Client
├── StateMonitor
│   ├── setInterval(30s) → Allow2 API polling
│   └── Trigger evaluation → ScriptManager
└── PollingMonitor
    ├── setInterval(custom) → ScriptManager
    ├── JSON parsing
    └── Condition evaluation → Allow2 API reporting
```

### Data Flow

**Mode 1 (Event-Driven)**:
```
StateMonitor (30s poll)
  → Allow2 API check
  → State comparison
  → Condition met?
  → ScriptManager.execute()
  → Process spawn
  → Result → UI
```

**Mode 2 (Polling)**:
```
PollingMonitor (interval)
  → ScriptManager.execute()
  → JSON parse
  → Condition eval
  → Report usage to Allow2
  → Result → UI
```

### IPC Communication Channels

**Main → Renderer**:
- `scriptOutput` - Real-time stdout/stderr
- `scriptComplete` - Execution finished
- `scriptError` - Execution failed
- `triggerFired` - State trigger activated
- `monitorRun` - Polling monitor executed
- `conditionMet` - Monitor condition satisfied

**Renderer → Main**:
- `saveScript`, `deleteScript`, `executeScript`
- `addTrigger`, `updateTrigger`, `removeTrigger`
- `addMonitor`, `updateMonitor`, `removeMonitor`
- `testSSH`, `saveSSHConfig`
- `getMonitorStatus`

---

## Conclusions

### Strengths

1. **Dual-Mode Design**: Supports both reactive (triggers) and proactive (polling) automation
2. **Cross-Platform**: Windows/Linux/Mac support with platform-specific shell detection
3. **Remote Execution**: SSH integration enables distributed automation
4. **Flexible Configuration**: Mustache templates + custom parameters
5. **Real-Time Feedback**: Stream-based output monitoring
6. **Lifecycle Management**: Proper cleanup on disable/unload

### Potential Improvements

1. **SSH Connection Pooling**: Reuse connections instead of open/close per execution
2. **Process Kill Mechanism**: Add ability to terminate long-running scripts
3. **Dynamic State Updates**: `newState()` could trigger monitor restart
4. **Retry Logic**: Failed script executions could support retry with backoff
5. **Output Buffering**: Large outputs could overflow memory (needs streaming limits)
6. **Nested JSON Field Support**: PollingMonitor condition field parsing unclear for nested objects

---

## Related Files

- **Main Entry**: `/src/index.js`
- **Script Execution**: `/src/ScriptManager.js`
- **Event Monitoring**: `/src/StateMonitor.js`
- **Polling Monitoring**: `/src/PollingMonitor.js`
- **UI Components**: `/src/Components/TabContent.js`, `/src/Components/ScriptEditor.js`
- **Build Config**: `/rollup.config.js`
- **Package Manifest**: `/package.json`

---

**Analysis Complete**: 2025-12-28
