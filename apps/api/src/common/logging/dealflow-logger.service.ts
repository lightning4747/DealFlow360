import { Injectable, LoggerService } from '@nestjs/common';
import { getCorrelationId, getTenantId } from './request-context';

@Injectable()
export class DealFlow360Logger implements LoggerService {
  private readonly sensitiveKeys = [
    'password',
    'token',
    'secret',
    'authorization',
    'creditcard',
    'pan',
    'cvv',
    'apikey',
    'key',
  ];

  private maskSensitiveData(data: any): any {
    if (!data) return data;
    if (typeof data === 'string') {
      // Mask credit card numbers (13-19 digits)
      const masked = data.replace(/\b(?:\d[ -]*?){13,19}\b/g, (match) => {
        const clean = match.replace(/[\s-]/g, '');
        return `****-****-****-${clean.slice(-4)}`;
      });
      return masked;
    }
    if (Array.isArray(data)) {
      return data.map((item) => this.maskSensitiveData(item));
    }
    if (typeof data === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(data)) {
        if (this.sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
          sanitized[key] = '***MASKED***';
        } else {
          sanitized[key] = this.maskSensitiveData(val);
        }
      }
      return sanitized;
    }
    return data;
  }

  private formatMessage(level: string, message: any, context?: string, ...optionalParams: any[]) {
    const correlationId = getCorrelationId();
    const tenantId = getTenantId();

    const logObject: Record<string, any> = {
      timestamp: new Date().toISOString(),
      level,
      service: 'dealflow360-api',
      correlationId,
      message: typeof message === 'string' ? this.maskSensitiveData(message) : message,
    };

    if (tenantId) {
      logObject.tenantId = tenantId;
    }

    if (context) {
      logObject.context = context;
    }

    if (optionalParams && optionalParams.length > 0) {
      logObject.meta = this.maskSensitiveData(optionalParams);
    }

    return JSON.stringify(logObject);
  }

  log(message: any, context?: string, ...optionalParams: any[]) {
    process.stdout.write(this.formatMessage('info', message, context, ...optionalParams) + '\n');
  }

  error(message: any, trace?: string, context?: string, ...optionalParams: any[]) {
    const correlationId = getCorrelationId();
    const tenantId = getTenantId();
    const logObject: Record<string, any> = {
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'dealflow360-api',
      correlationId,
      message: typeof message === 'string' ? this.maskSensitiveData(message) : message,
    };
    if (tenantId) logObject.tenantId = tenantId;
    if (context) logObject.context = context;
    if (trace) logObject.trace = trace;
    if (optionalParams && optionalParams.length > 0) {
      logObject.meta = this.maskSensitiveData(optionalParams);
    }
    process.stderr.write(JSON.stringify(logObject) + '\n');
  }

  warn(message: any, context?: string, ...optionalParams: any[]) {
    process.stdout.write(this.formatMessage('warn', message, context, ...optionalParams) + '\n');
  }

  debug?(message: any, context?: string, ...optionalParams: any[]) {
    process.stdout.write(this.formatMessage('debug', message, context, ...optionalParams) + '\n');
  }

  verbose?(message: any, context?: string, ...optionalParams: any[]) {
    process.stdout.write(this.formatMessage('verbose', message, context, ...optionalParams) + '\n');
  }
}
