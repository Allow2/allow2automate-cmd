# Command Executor Plugin

Enable Allow2Automate the ability to run commands and scripts on the local device for advanced automation and parental control scenarios.

## Description

This plugin extends Allow2Automate with powerful command execution capabilities, allowing parents to automate device management tasks, run scripts based on quota events, and integrate with system-level parental controls.

## Features

- Execute arbitrary commands and scripts locally
- Schedule scripts to run at specific times
- Command execution status tracking
- Success and failure event triggers
- Support for multiple scripting languages
- Secure command validation and sandboxing
- Integration with system parental controls

## Installation

### Via NPM

```bash
npm install @allow2/allow2automate-cmd
```

### Via Git

```bash
git clone https://github.com/Allow2/allow2automate-cmd.git
cd allow2automate-cmd
npm install
npm run build
```

## Configuration

1. Install the plugin in your Allow2Automate application
2. Configure command execution permissions
3. Set up script directories and allowed commands
4. Configure security restrictions

### Required Permissions

This plugin requires the following permissions:

- **system**: To execute commands and scripts on the local operating system
- **configuration**: To read plugin settings and manage command execution rules
- **filesystem**: To access script files and write execution logs

These permissions are necessary for the plugin to:
- Execute system commands and custom scripts
- Schedule and manage automated tasks
- Access and run scripts stored on the filesystem
- Log command execution results for audit purposes

**Security Note**: This plugin has elevated permissions. Only install from trusted sources and carefully review any commands before execution.

## Usage

### Execute Command

```javascript
import CmdPlugin from '@allow2/allow2automate-cmd';

const plugin = new CmdPlugin();

await plugin.actions.execute({
  command: 'shutdown',
  args: ['-s', '-t', '300'],
  timeout: 30000
});
```

### Schedule Script

```javascript
await plugin.actions.scheduleScript({
  scriptPath: '/path/to/script.sh',
  schedule: '0 22 * * *', // Run at 10 PM daily
  enabled: true
});
```

### Listen for Events

```javascript
plugin.on('commandCompleted', (result) => {
  console.log('Command completed:', result);
});

plugin.on('commandFailed', (error) => {
  console.error('Command failed:', error);
});
```

## API Documentation

### Actions

#### `execute`
- **Name**: Execute Command
- **Description**: Execute a command or script on the local device
- **Parameters**:
  - `command` (string): Command to execute
  - `args` (array): Command arguments
  - `workingDir` (string, optional): Working directory
  - `timeout` (number, optional): Execution timeout in milliseconds
- **Returns**: Execution result with stdout, stderr, and exit code

#### `scheduleScript`
- **Name**: Schedule Script
- **Description**: Schedule a script to run at specific times
- **Parameters**:
  - `scriptPath` (string): Path to script file
  - `schedule` (string): Cron expression for schedule
  - `enabled` (boolean): Enable/disable scheduled execution
- **Returns**: Schedule configuration

### Triggers

#### `commandCompleted`
- **Name**: Command Completed
- **Description**: Triggered when a command execution completes successfully
- **Payload**:
  - `command` (string): Executed command
  - `stdout` (string): Standard output
  - `exitCode` (number): Exit code
  - `duration` (number): Execution duration in milliseconds

#### `commandFailed`
- **Name**: Command Failed
- **Description**: Triggered when a command execution fails
- **Payload**:
  - `command` (string): Failed command
  - `error` (string): Error message
  - `stderr` (string): Standard error output
  - `exitCode` (number): Exit code

## Security Considerations

This plugin executes system commands with elevated privileges. To maintain security:

1. **Validate all commands** before execution
2. **Use whitelist approach** for allowed commands
3. **Sanitize user inputs** to prevent injection attacks
4. **Run commands with minimal privileges** when possible
5. **Log all executions** for audit purposes
6. **Review scheduled scripts** regularly

## Development Setup

```bash
# Clone the repository
git clone https://github.com/Allow2/allow2automate-cmd.git
cd allow2automate-cmd

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Requirements

- Node.js 12.0 or higher
- Allow2Automate 2.0.0 or higher
- Appropriate operating system permissions for command execution

## License

MIT - See [LICENSE](LICENSE) file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/Allow2/allow2automate-cmd/issues)
- **Documentation**: [Allow2 Documentation](https://www.allow2.com/docs)
- **Community**: [Allow2 Community Forums](https://community.allow2.com)

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## Author

Allow2

## Keywords

allow2automate, allow2, cmd, plugin, utilities, parental-controls, automation
