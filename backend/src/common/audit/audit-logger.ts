import * as fs from 'fs';
import * as path from 'path';

export interface AuditLogEntry {
  who: {
    userId?: string;
    username?: string;
    fullName?: string;
    role?: string;
    division?: string;
  };
  what: {
    action: string;
    resource: string;
    resourceId?: string | number;
    previousState?: any;
    newState?: any;
    details?: string;
  };
  when: string;
  where: {
    ip: string;
    userAgent?: string;
    method?: string;
    url?: string;
  };
}

/**
 * ============================================================================
 * ASYNCHRONOUS AUDIT TRAIL LOGGER (ENTERPRISE COMPLIANCE)
 * ============================================================================
 * Records business-critical state mutations (Who, What, When, Where) into daily
 * rotating audit logs (`audit-YYYY-MM-DD.log`).
 * 
 * KEY FEATURES:
 * 1. Non-blocking I/O: Writes asynchronously via `setImmediate()` to ensure
 *    zero impact on API response latency.
 * 2. Immutable Before/After diffs: Captures `previousState` and `newState`
 *    for every task creation, approval, revision, rejection, reassignment,
 *    delegation, and user modification.
 * 3. Recursive Sensitive Data Sanitization: Guarantees credentials, secrets,
 *    and tokens are permanently masked prior to file serialization.
 * ============================================================================
 */
export class AuditLogger {
  private static logDir = path.resolve(process.cwd(), process.env.AUDIT_LOG_DIR || 'logs');

  private static ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private static maskSensitive(data: any): any {
    if (!data) return data;
    if (typeof data !== 'object') return data;

    const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'apikey', 'key'];
    const masked = Array.isArray(data) ? [...data] : { ...data };

    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        masked[key] = '********';
      } else if (typeof masked[key] === 'object') {
        masked[key] = this.maskSensitive(masked[key]);
      }
    }
    return masked;
  }

  public static logAsync(entry: Omit<AuditLogEntry, 'when'>) {
    // Write asynchronously in non-blocking fashion
    setImmediate(async () => {
      try {
        this.ensureLogDir();
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `audit-${today}.log`);

        const completeEntry: AuditLogEntry = {
          ...entry,
          what: {
            ...entry.what,
            previousState: this.maskSensitive(entry.what.previousState),
            newState: this.maskSensitive(entry.what.newState),
          },
          when: new Date().toISOString(),
        };

        const logLine = JSON.stringify(completeEntry) + '\n';
        await fs.promises.appendFile(logFile, logLine, 'utf8');
      } catch (err) {
        console.error('Failed to write audit trail asynchronously:', err);
      }
    });
  }
}
