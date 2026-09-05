import { DealFlow360Logger } from '../src/common/logging/dealflow-logger.service';
import { runWithContext, getCorrelationId } from '../src/common/logging/request-context';

describe('Logging & Correlation Propagation (Phase 6 Observability)', () => {
  it('should propagate correlationId within AsyncLocalStorage store', () => {
    const testId = 'corr-test-12345';
    runWithContext({ correlationId: testId }, () => {
      expect(getCorrelationId()).toBe(testId);
    });
  });

  it('should format logs in structured JSON format with zero plain-text', () => {
    const logger = new DealFlow360Logger();
    let capturedOutput = '';
    const stdoutWrite = process.stdout.write;
    try {
      process.stdout.write = ((str: any) => {
        capturedOutput = str;
        return true;
      }) as any;

      runWithContext({ correlationId: 'corr-structured-log-99' }, () => {
        logger.log('Payment initialized', 'PaymentTest');
      });

      const parsed = JSON.parse(capturedOutput.trim());
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed.level).toBe('info');
      expect(parsed.service).toBe('dealflow360-api');
      expect(parsed.correlationId).toBe('corr-structured-log-99');
      expect(parsed.message).toBe('Payment initialized');
      expect(parsed.context).toBe('PaymentTest');
    } finally {
      process.stdout.write = stdoutWrite;
    }
  });

  it('should automatically mask sensitive credit card PANs and secret tokens', () => {
    const logger = new DealFlow360Logger();
    let capturedOutput = '';
    const stdoutWrite = process.stdout.write;
    try {
      process.stdout.write = ((str: any) => {
        capturedOutput = str;
        return true;
      }) as any;

      logger.log('Processing transaction with card 4111 2222 3333 4444 and secret token', 'PIISecurity', {
        password: 'my-super-secret-password',
        token: 'tok_live_9999999',
      });

      const parsed = JSON.parse(capturedOutput.trim());
      expect(parsed.message).toContain('****-****-****-4444');
      expect(parsed.meta[0].password).toBe('***MASKED***');
      expect(parsed.meta[0].token).toBe('***MASKED***');
    } finally {
      process.stdout.write = stdoutWrite;
    }
  });
});
