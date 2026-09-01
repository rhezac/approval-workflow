import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ============================================================================
 * SECURITY & SENSITIVE DATA MASKING UTILITY
 * ============================================================================
 * Recursively traverses incoming request payloads, URL query parameters, headers,
 * and response bodies to replace sensitive fields (passwords, JWT tokens, API keys)
 * with masked strings before logging to disk or console.
 */
export function maskSensitiveData(obj: any): any {
  if (!obj) return obj;
  if (typeof obj !== 'object') return obj;

  const sensitiveFields = [
    'password',
    'pass',
    'token',
    'secret',
    'authorization',
    'apikey',
    'x-api-key',
    'accessToken',
    'refreshToken',
  ];

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveData(item));
  }

  const cloned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      cloned[key] = '********';
    } else if (typeof value === 'object' && value !== null) {
      cloned[key] = maskSensitiveData(value);
    } else {
      cloned[key] = value;
    }
  }
  return cloned;
}

/**
 * ============================================================================
 * ASYNCHRONOUS SYSTEM HTTP LOGGING INTERCEPTOR
 * ============================================================================
 * Intercepts all incoming HTTP requests and outgoing responses across the application.
 * Logs execution duration, client IP, route method, status code, and sanitized payloads
 * to daily rotating log files (`system-YYYY-MM-DD.log`) using non-blocking setImmediate()
 * I/O to ensure zero latency overhead on client requests.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly logDir = path.resolve(process.cwd(), process.env.SYSTEM_LOG_DIR || 'logs');

  private ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private writeLogToFile(logEntry: any) {
    setImmediate(async () => {
      try {
        this.ensureLogDir();
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `system-${today}.log`);
        const logLine = JSON.stringify(logEntry) + '\n';
        await fs.promises.appendFile(logFile, logLine, 'utf8');
      } catch (err) {
        console.error('Failed to write system log to file:', err);
      }
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();

    const { method, originalUrl, ip, headers, query, params, body } = req;
    const user = (req as any).user;
    const startTime = Date.now();

    const sanitizedReqHeaders = maskSensitiveData(headers);
    const sanitizedReqBody = maskSensitiveData(body);
    const sanitizedQuery = maskSensitiveData(query);
    const sanitizedParams = maskSensitiveData(params);

    return next.handle().pipe(
      tap({
        next: (responseData: any) => {
          const duration = Date.now() - startTime;
          const statusCode = res?.statusCode || 200;
          const sanitizedResBody = maskSensitiveData(responseData);

          this.logger.log(`[${method}] ${originalUrl} ${statusCode} - ${ip} - ${duration}ms`);

          this.writeLogToFile({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            durationMs: duration,
            request: {
              method,
              url: originalUrl,
              ip,
              user: user ? { id: user.id, username: user.username, role: user.role } : null,
              headers: sanitizedReqHeaders,
              params: sanitizedParams,
              query: sanitizedQuery,
              body: sanitizedReqBody,
            },
            response: {
              statusCode,
              body: sanitizedResBody,
            },
          });
        },
        error: (err: any) => {
          const duration = Date.now() - startTime;
          const statusCode = err?.status || err?.statusCode || 500;
          const errorResponse = err?.response || { message: err.message };
          const sanitizedErrorRes = maskSensitiveData(errorResponse);

          this.logger.error(
            `[${method}] ${originalUrl} ${statusCode} - ${ip} - ${duration}ms - Error: ${err.message}`,
          );

          this.writeLogToFile({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            durationMs: duration,
            request: {
              method,
              url: originalUrl,
              ip,
              user: user ? { id: user.id, username: user.username, role: user.role } : null,
              headers: sanitizedReqHeaders,
              params: sanitizedParams,
              query: sanitizedQuery,
              body: sanitizedReqBody,
            },
            response: {
              statusCode,
              error: sanitizedErrorRes,
            },
          });
        },
      }),
    );
  }
}
