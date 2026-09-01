import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { ensureDatabaseExists } from './database-helper';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Auto ensure database exists before TypeORM connects
  await ensureDatabaseExists();

  const app = await NestFactory.create(AppModule);

  // Security Headers & Optimization
  app.use(
    helmet({
      contentSecurityPolicy: false, // Swagger UI compatibility
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Prefix
  app.setGlobalPrefix('api');

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // OpenAPI / Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Approval Workflow API Documentation')
    .setDescription(
      'REST API documentation for Enterprise Approval Workflow System with Multi-Level Approvals, Role-Based Access, and Audit Trail.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'Manual API Key authentication for external integrations',
      },
      'API-Key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Approval Workflow API Explorer',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`=======================================================`);
  logger.log(`🚀 Approval Workflow Backend started on port: ${port}`);
  logger.log(`📖 API Documentation available at: http://localhost:${port}/api/docs`);
  logger.log(`❤️  Health check available at: http://localhost:${port}/api/health`);
  logger.log(`=======================================================`);
}

bootstrap();
