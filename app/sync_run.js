const crypto = require('node:crypto');
const { sanitizePageUrl } = require('../collectors/page_helpers');

async function recordedSync(repository, { accountId, collector, pageUrl }, operation) {
  const syncRunId = crypto.randomUUID();
  repository.startSync({ syncRunId, accountId, collector, pageUrl: sanitizePageUrl(pageUrl) });
  try {
    const outcome = await operation(syncRunId);
    repository.finishSync(syncRunId, {
      result: outcome.status || 'PASS', itemCount: outcome.item_count ?? 0,
      errorCount: outcome.errors?.length ?? 0, details: outcome.details || {},
    });
    return { sync_run_id: syncRunId, ...outcome };
  } catch (error) {
    repository.finishSync(syncRunId, { result: 'FAIL', errorCount: 1, details: { error_code: error.code || error.message } });
    throw error;
  }
}

module.exports = { recordedSync };
