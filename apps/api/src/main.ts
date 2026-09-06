import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { DealFlow360Logger } from './common/logging/dealflow-logger.service';

async function bootstrap() {
  const logger = new DealFlow360Logger();
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:8000'],
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3000;
  try {
    await app.listen(port);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      logger.warn(
        `API port ${port} is already in use. Reusing the existing API process instead of crashing.`,
        'Bootstrap',
      );
      await app.close();
      return;
    }
    throw error;
  }
  logger.log(`DealFlow360 API listening on port ${port}`, 'Bootstrap');
}

bootstrap();
