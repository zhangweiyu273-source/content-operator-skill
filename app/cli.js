const path = require('node:path');
const { ConnectorService } = require('./service');
const { workspacePath } = require('./config');

async function main() {
  const command = process.argv[2] || 'health';
  const service = new ConnectorService(workspacePath());
  try {
    if (command === 'health') {
      const status = await service.status();
      console.log(JSON.stringify({ database: status.database, workspace: path.resolve(service.workspace.root) }, null, 2));
    } else if (command === 'backup') {
      const destination = await service.database.createBackup(service.workspace.backups);
      console.log(JSON.stringify({ backup: destination }, null, 2));
    } else {
      throw new Error('COMMAND_UNKNOWN');
    }
  } finally { service.close(); }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

module.exports = { main };
