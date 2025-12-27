# Allow2Automate CMD Plugin

Execute local and remote commands/scripts triggered by Allow2 quota state changes or on scheduled intervals.

## Features

- **Two Operating Modes:**
  - **Mode 1 (Event-Driven)**: Execute scripts when Allow2 quota states change
  - **Mode 2 (Polling)**: Run scripts on intervals, parse JSON responses, report usage to Allow2

- **Flexible Execution:**
  - Run commands locally as current user
  - Execute via SSH on remote devices
  - Support for both password and SSH key authentication

- **Advanced Scripting:**
  - Mustache template parameters (`{{childName}}`, `{{quotaRemaining}}`, etc.)
  - Custom parameter definitions
  - Multi-line script editor with syntax highlighting

- **Complete Management UI:**
  - Script library with search and filtering
  - Remote device credential storage (password/SSH key)
  - Event trigger configuration
  - Polling monitor setup with JSON condition evaluation

## Installation

```bash
npm install @allow2/allow2automate-cmd
```

Or install via the Allow2Automate plugin marketplace.

## Quick Start

### 1. Create a Remote Device (Optional)

If you want to execute scripts on remote devices via SSH:

1. Go to the **Remote Devices** tab
2. Click **Add Device**
3. Enter:
   - Device name (e.g., "Router", "Mac Mini")
   - Hostname/IP address
   - Port (default: 22)
   - Username
   - Choose authentication method:
     - **Password**: Enter password
     - **SSH Key**: Paste private key (and optional passphrase)
4. Click **Test Connection** to verify
5. Click **Save**

### 2. Create a Script

1. Go to the **Scripts** tab
2. Click **Create Script**
3. Fill in:
   - **Script Name**: Descriptive name
   - **Description**: What the script does
   - **Script Content**: Your bash/shell commands (multi-line)
   - **Execute on Remote Device**: Toggle if using SSH
   - **Remote Device**: Select device (if SSH enabled)
   - **Timeout**: Maximum execution time in milliseconds
4. **Add Custom Parameters** (optional):
   - Click "Add" to define custom parameters
   - Use in script with `{{parameterName}}`
5. Click **Test** to verify execution
6. Click **Save**

### 3. Setup Event Trigger (Mode 1)

Automatically execute scripts when quota states change:

1. Go to the **Event Triggers** tab
2. Click **Add Trigger**
3. Configure:
   - **Trigger Name**: Descriptive name
   - **Child**: Select child to monitor
   - **Activity Type**: gaming, internet, screen, etc.
   - **Condition**: Choose from:
     - "Allowed → Blocked (time runs out)"
     - "Blocked → Allowed (time granted)"
     - "Permission Removed"
     - "Permission Granted"
     - "Drops Below Threshold"
     - "Rises Above Threshold"
   - **Threshold**: (if using threshold condition) Value in seconds
   - **Script to Execute**: Select from your script library
   - **Enabled**: Toggle on/off
4. Click **Save**

### 4. Setup Polling Monitor (Mode 2)

Run scripts on intervals and report usage based on responses:

1. Go to the **Polling Monitors** tab
2. Click **Add Monitor**
3. Configure:
   - **Monitor Name**: Descriptive name
   - **Script to Run**: Select script that returns JSON
   - **Run Every**: Choose interval (1 min, 5 min, 10 min, etc.)
   - **JSON Response Condition**:
     - **Field to Check**: e.g., "active", "isConnected", "userOnline"
     - **Condition**: Is True, Equals, Greater Than, etc.
     - **Value**: (if using comparison operator)
   - **Report Usage to Allow2**: Toggle on to report usage
     - **Child**: Select child
     - **Activity Type**: gaming, internet, etc.
     - **Usage Amount**: How much quota to deduct per occurrence
   - **Enabled**: Toggle on/off
4. Click **Save**

## Use Cases

### 1. Gaming Console Control

**Scenario**: Automatically turn off gaming console when gaming time expires

**Setup**:
1. Create script (local or SSH to smart home hub):
```bash
# Using WeMo
wemo switch "Gaming Console" off

# Using Home Assistant via SSH
curl -X POST http://homeassistant.local/api/services/switch/turn_off \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"entity_id": "switch.gaming_console"}'
```

2. Create trigger:
   - Child: "Bob"
   - Activity: "gaming"
   - Condition: "Allowed → Blocked (time runs out)"
   - Script: "Turn Off Gaming Console"

**Result**: Console automatically powers off when Bob's gaming time depletes.

---

### 2. Network Access Control via Router

**Scenario**: Block internet access at router level when quota expires

**Setup**:
1. Add router as remote device:
   - Name: "Home Router"
   - Host: 192.168.1.1
   - Username: admin
   - Auth: SSH Key

2. Create script (SSH mode):
```bash
# Block device by MAC address
iptables -A FORWARD -m mac --mac-source {{childDeviceMAC}} -j DROP

# Or using OpenWrt
uci add firewall rule
uci set firewall.@rule[-1].src='lan'
uci set firewall.@rule[-1].mac='{{childDeviceMAC}}'
uci set firewall.@rule[-1].target='REJECT'
uci commit firewall
/etc/init.d/firewall reload
```

3. Create trigger:
   - Child: "Alice"
   - Activity: "internet"
   - Condition: "Allowed → Blocked"
   - Script: "Block Internet Access"

**Parameters**: Add custom parameter `childDeviceMAC` = "AA:BB:CC:DD:EE:FF"

**Result**: Alice's device is blocked at the router when internet quota expires.

---

### 3. Active Gaming Session Monitoring

**Scenario**: Monitor if child is actively playing games and report usage automatically

**Setup**:
1. Create script that returns JSON:
```bash
#!/bin/bash
# Check if Minecraft is running
if pgrep -x "minecraft" > /dev/null; then
  echo '{"active": true, "game": "minecraft", "pid": '$(pgrep minecraft)'}'
else
  echo '{"active": false}'
fi
```

2. Create polling monitor:
   - Script: "Check Gaming Process"
   - Interval: 1 minute
   - Condition Field: `active`
   - Condition Operator: Is True
   - Report Usage: Yes
   - Child: "Bob"
   - Activity: "gaming"
   - Amount: 1 (minute)

**Result**: Every minute, the script checks if Minecraft is running. If yes, it reports 1 minute of gaming usage to Allow2.

---

### 4. Mac Screen Lock on Bedtime

**Scenario**: Lock Mac screen when bedtime quota expires

**Setup**:
1. Add Mac as remote device (SSH key recommended)

2. Create script (SSH to Mac):
```bash
# Lock screen immediately
pmset displaysleepnow

# Or force logout
sudo launchctl bootout user/$(id -u {{username}})
```

3. Create trigger:
   - Child: "Sarah"
   - Activity: "screen"
   - Condition: "Allowed → Blocked"
   - Script: "Lock Mac Screen"

**Result**: Sarah's Mac screen locks automatically when bedtime quota expires.

---

### 5. Smart Home Integration

**Scenario**: Dim lights and lower TV volume at bedtime

**Setup**:
1. Create script (SSH to Home Assistant server):
```bash
#!/bin/bash
# Dim bedroom lights to 20%
curl -X POST http://homeassistant.local:8123/api/services/light/turn_on \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"entity_id": "light.bedroom", "brightness": 51}'

# Lower TV volume
curl -X POST http://homeassistant.local:8123/api/services/media_player/volume_set \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"entity_id": "media_player.bedroom_tv", "volume_level": 0.2}'
```

2. Create trigger:
   - Child: "Emma"
   - Activity: "screen"
   - Condition: "Drops Below Threshold"
   - Threshold: 300 (5 minutes)
   - Script: "Bedtime Warning"

**Result**: 5 minutes before Emma's screen time expires, lights dim and TV volume lowers as a warning.

---

### 6. PC Shutdown Windows

**Scenario**: Shutdown Windows PC when quota expires

**Setup**:
1. Add PC as remote device (SSH via OpenSSH server on Windows)

2. Create script (SSH mode):
```bash
# Shutdown in 60 seconds with warning
shutdown /s /t 60 /c "Screen time quota expired. Shutting down in 60 seconds."
```

3. Create trigger:
   - Child: "Tom"
   - Activity: "screen"
   - Condition: "Allowed → Blocked"
   - Script: "Shutdown PC"

**Result**: PC shuts down with 60-second warning when Tom's screen time runs out.

## Script Parameters

### Built-in Parameters

Use mustache syntax `{{parameterName}}` in your scripts:

| Parameter | Description | Example Value |
|-----------|-------------|---------------|
| `{{childName}}` | Child's display name | "Bob" |
| `{{childId}}` | Child's unique ID | "child-123" |
| `{{activityType}}` | Activity type being monitored | "gaming" |
| `{{quotaRemaining}}` | Remaining quota in seconds | 1800 |
| `{{currentRemaining}}` | Current quota remaining | 900 |
| `{{previousRemaining}}` | Previous quota value | 1200 |
| `{{wasAllowed}}` | Previous allowed state | true |
| `{{isAllowed}}` | Current allowed state | false |
| `{{timestamp}}` | ISO 8601 timestamp | "2025-01-15T14:30:00Z" |

### Custom Parameters

Define your own parameters for flexible scripts:

1. In Script Editor, add custom parameter names
2. Click "Add" to save each parameter
3. Use in script: `{{myCustomParam}}`
4. When trigger fires, values are automatically substituted

**Example**:
```bash
# Script with custom parameters
ssh {{serverHost}} "docker stop {{containerName}}"
```

Custom parameters:
- `serverHost` = "192.168.1.50"
- `containerName` = "minecraft-server"

## Mode 2: JSON Response Format

Polling monitors require scripts to return **valid JSON**:

### Simple Boolean Check
```json
{
  "active": true
}
```

### Multiple Fields
```json
{
  "active": true,
  "status": "connected",
  "value": 42,
  "username": "alice"
}
```

### Complex Conditions
```json
{
  "system": {
    "cpu": 85,
    "memory": 70
  },
  "processes": {
    "gaming": true,
    "streaming": false
  }
}
```

Configure monitor to check specific field:
- **Field**: `processes.gaming` (supports nested fields)
- **Operator**: Is True
- **Action**: Report usage

## Architecture

### Core Components

**ScriptManager** (`ScriptManager.js`)
- Executes scripts locally via `child_process`
- SSH execution via `ssh2` library
- Mustache template parameter substitution
- Timeout and error handling

**StateMonitor** (`StateMonitor.js`)
- Polls Allow2 API every 30 seconds (configurable)
- Detects quota state transitions
- Triggers script execution on condition match
- Maintains state history for comparison

**PollingMonitor** (`PollingMonitor.js`)
- Runs scripts on configurable intervals
- Parses JSON responses from scripts
- Evaluates conditions against JSON fields
- Reports usage to Allow2 API when conditions met

**Plugin Main** (`index.js`)
- Manages plugin lifecycle (load, enable, disable, unload)
- IPC communication with renderer process
- Configuration persistence
- Coordinates all managers

### Data Flow

#### Mode 1 (Event-Driven):
```
StateMonitor (30s poll) → Allow2 API
  ↓ (detects state change)
Trigger Evaluation
  ↓ (condition met)
ScriptManager → Execute (local/SSH)
  ↓
Result → Notify UI
```

#### Mode 2 (Polling):
```
PollingMonitor (interval) → ScriptManager
  ↓
Execute Script (local/SSH)
  ↓
Parse JSON Response
  ↓ (condition met)
Report Usage → Allow2 API
  ↓
Notify UI
```

### IPC Communication

Renderer (UI) ↔ Main Process communication:

**Script Operations:**
- `saveScript` - Save/update script
- `deleteScript` - Remove script
- `executeScript` - Run script manually
- `testSSH` - Test SSH connection

**Trigger Operations:**
- `addTrigger` - Create event trigger
- `updateTrigger` - Modify trigger
- `removeTrigger` - Delete trigger

**Monitor Operations:**
- `addMonitor` - Create polling monitor
- `updateMonitor` - Modify monitor
- `removeMonitor` - Delete monitor
- `getMonitorStatus` - Check status

**Events (Main → Renderer):**
- `scriptOutput` - Real-time script output
- `scriptComplete` - Script finished
- `scriptError` - Script failed
- `triggerFired` - Trigger executed
- `monitorRun` - Monitor executed
- `conditionMet` - Condition satisfied

## Security Considerations

### Credential Storage
- SSH passwords and private keys are stored in the plugin's persisted state
- State is encrypted by Electron's built-in storage
- Consider using SSH keys instead of passwords for better security

### Script Execution
- Scripts run with the same permissions as Allow2Automate application
- Local scripts execute as current user
- SSH scripts execute as configured remote user
- No privilege escalation without explicit `sudo` in script

### SSH Security Best Practices
1. **Use SSH keys** instead of passwords when possible
2. **Protect private keys** with passphrases
3. **Limit SSH user permissions** on remote devices
4. **Use dedicated automation users** instead of root/admin
5. **Audit scripts regularly** for security issues

### Input Validation
- Parameter substitution uses Mustache templating (safe by default)
- No shell injection via parameters
- Script timeout prevents infinite execution
- JSON parsing validates structure before evaluation

## Troubleshooting

### Script Won't Execute

**Problem**: Script doesn't run when triggered

**Solutions**:
1. Check script syntax - test locally first
2. Verify timeout is sufficient (increase if needed)
3. Check main process logs for error messages
4. Test script manually via "Execute Now" button
5. Ensure script has correct permissions (chmod +x for shell scripts)

### SSH Connection Fails

**Problem**: Cannot connect to remote device

**Solutions**:
1. Use **Test Connection** button to verify settings
2. Verify hostname/IP is reachable (`ping` test)
3. Check SSH server is running on remote device
4. Verify port (default 22) is correct and not firewalled
5. For **password auth**: Ensure password is correct
6. For **key auth**:
   - Verify key format (PEM format recommended)
   - Check key permissions (should be 600)
   - Ensure public key is in `~/.ssh/authorized_keys` on remote
7. Check username is correct for remote system

### Trigger Not Firing

**Problem**: Event trigger doesn't execute

**Solutions**:
1. Verify trigger is **Enabled**
2. Check child has active quota for specified activity
3. Review trigger condition matches expected state change
4. Monitor polling interval (State monitor polls every 30s by default)
5. Check main process logs for errors
6. Verify script associated with trigger exists

### Polling Monitor Not Running

**Problem**: Scheduled monitor doesn't execute

**Solutions**:
1. Check monitor is **Enabled**
2. Verify script returns valid JSON:
   ```bash
   # Test script output
   ./your-script.sh | jq .
   ```
3. Review condition field exists in JSON response
4. Check condition operator and value are correct
5. Verify interval is reasonable (not too short)
6. Check script execution logs

### JSON Parsing Errors

**Problem**: Monitor reports JSON parsing error

**Solutions**:
1. Validate JSON output:
   ```bash
   ./your-script.sh | python -m json.tool
   ```
2. Ensure script outputs **only** JSON (no debug messages)
3. Check for trailing commas or syntax errors
4. Verify field names match condition configuration
5. Use proper quoting in bash:
   ```bash
   echo '{"active": true}'  # Correct
   echo {"active": true}    # Wrong
   ```

### Usage Not Reported

**Problem**: Polling monitor doesn't report to Allow2

**Solutions**:
1. Verify "Report Usage to Allow2" is enabled
2. Check child and activity type are configured
3. Ensure condition is being met (check logs)
4. Verify Allow2 API connectivity
5. Check usage amount is > 0
6. Review Allow2 quota exists for specified activity

## Development

### Build Plugin

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Watch mode (auto-rebuild on changes)
npm start

# Outputs to:
# - dist/index.js (CommonJS)
# - dist/index.es.js (ES modules)
```

### Testing

```bash
# Test individual components
node -e "require('./dist/index.js')"

# Test script execution
# (create test script and use UI to execute)
```

### Directory Structure

```
allow2automate-cmd/
├── src/
│   ├── index.js                 # Main plugin entry
│   ├── ScriptManager.js         # Script execution engine
│   ├── StateMonitor.js          # Event-driven monitoring
│   ├── PollingMonitor.js        # Scheduled execution
│   └── Components/
│       ├── TabContent.js        # Main UI container
│       ├── ScriptEditor.js      # Script creation/editing
│       ├── ScriptList.js        # Script library
│       ├── RemoteDeviceManager.js  # SSH credentials
│       ├── TriggerConfig.js     # Event triggers
│       ├── PollingConfig.js     # Polling monitors
│       └── Checkbox.js          # Shared component
├── dist/                        # Built output
├── package.json                 # Dependencies & metadata
├── rollup.config.js             # Build configuration
└── README.md                    # This file
```

## API Reference

### Script Configuration

```typescript
interface Script {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  description?: string;          // Optional description
  script: string;                // Multi-line script content
  useSSH: boolean;              // Execute via SSH?
  remoteDeviceId?: string;      // Remote device ID (if SSH)
  timeout: number;              // Timeout in milliseconds
  workingDir?: string;          // Working directory (local only)
  env?: Record<string, string>; // Environment variables
  parameters: string[];         // Custom parameter names
  updatedAt: number;            // Last modified timestamp
}
```

### Trigger Configuration

```typescript
interface Trigger {
  id: string;                   // Unique identifier
  name: string;                 // Display name
  childId: string;              // Child to monitor
  childName: string;            // Child display name
  activityType: string;         // Activity type
  condition: TriggerCondition;  // Condition type
  threshold?: number;           // Threshold value (if applicable)
  scriptId: string;             // Script to execute
  enabled: boolean;             // Active status
  lastTriggered?: number;       // Last execution timestamp
  updatedAt: number;            // Last modified timestamp
}

type TriggerCondition =
  | 'positive_to_zero'          // Quota depletes
  | 'zero_to_positive'          // Quota granted
  | 'allowed_to_blocked'        // Permission removed
  | 'blocked_to_allowed'        // Permission granted
  | 'below_threshold'           // Drops below value
  | 'above_threshold';          // Rises above value
```

### Monitor Configuration

```typescript
interface Monitor {
  id: string;                   // Unique identifier
  name: string;                 // Display name
  scriptConfig: Script;         // Script to execute
  intervalMs: number;           // Run interval (milliseconds)
  conditionField: string;       // JSON field to check
  conditionOperator: Operator;  // Comparison operator
  conditionValue?: any;         // Value to compare
  reportUsage: boolean;         // Report to Allow2?
  childId?: string;             // Child ID (if reporting)
  childName?: string;           // Child name (if reporting)
  activityType?: string;        // Activity type (if reporting)
  usageAmount?: number;         // Quota to deduct
  enabled: boolean;             // Active status
  lastRun?: number;             // Last execution timestamp
  runCount: number;             // Total runs
  errorCount: number;           // Total errors
  updatedAt: number;            // Last modified timestamp
}

type Operator =
  | 'truthy'                    // Truthy check
  | 'falsy'                     // Falsy check
  | 'equals'                    // Equality
  | 'not_equals'                // Inequality
  | 'greater_than'              // Greater than
  | 'less_than';                // Less than
```

### Remote Device Configuration

```typescript
interface RemoteDevice {
  id: string;                   // Unique identifier
  name: string;                 // Display name
  host: string;                 // Hostname or IP
  port: number;                 // SSH port (default 22)
  username: string;             // SSH username
  authMethod: 'password' | 'key'; // Auth method
  password?: string;            // Password (if password auth)
  privateKey?: string;          // Private key (if key auth)
  passphrase?: string;          // Key passphrase (optional)
  updatedAt: number;            // Last modified timestamp
}
```

## FAQ

**Q: Can I use this plugin to control Windows PCs?**
A: Yes! Install OpenSSH Server on Windows and use SSH mode to execute PowerShell or CMD commands remotely.

**Q: What shells are supported for local execution?**
A: On Linux/Mac: bash, sh, zsh. On Windows: cmd.exe, PowerShell. The plugin uses the system's default shell.

**Q: Can I have multiple triggers for the same child?**
A: Yes! You can create multiple triggers with different conditions and scripts.

**Q: How accurate is the state monitoring?**
A: StateMonitor polls Allow2 every 30 seconds by default. State changes are detected within this window.

**Q: Can polling monitors run faster than 1 minute?**
A: Yes, but be cautious of system load. You can configure intervals as low as needed, but 1 minute is recommended minimum.

**Q: Are SSH credentials stored securely?**
A: Credentials are stored in Electron's encrypted storage, but SSH keys are more secure than passwords. Use keys when possible.

**Q: Can I backup my scripts and configurations?**
A: Yes, the plugin state is stored in Allow2Automate's configuration. Back up the app data directory to preserve all settings.

**Q: Does this work with Docker containers?**
A: Yes! Use SSH to connect to Docker host and execute `docker exec` commands, or use local execution if running on same machine.

## Support & Contributing

- **Issues**: [GitHub Issues](https://github.com/Allow2/allow2automate-cmd/issues)
- **Documentation**: [Allow2 Automate Docs](https://allow2.com/automate)
- **Discussion**: [Community Forum](https://community.allow2.com)

### Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Changelog

### v1.0.0 (2025-01-15)
- Initial release
- Mode 1: Event-driven triggers
- Mode 2: Polling monitors with JSON parsing
- SSH and local execution support
- Complete UI with 4 management tabs
- Mustache parameter substitution
- Remote device credential management

## License

MIT License

Copyright (c) 2025 Allow2 Pty Ltd

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**Made with ❤️ by Allow2** - Helping families manage screen time and device usage responsibly.
