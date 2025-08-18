// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Security
    app.use(helmet());

    // CORS
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
    });

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // Strip unknown properties
            forbidNonWhitelisted: true, // Throw error if unknown properties
            transform: true, // Transform payloads to DTO instances
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // Swagger documentation
    const config = new DocumentBuilder()
        .setTitle('Property Management System API')
        .setDescription('Comprehensive property management system with multi-tenant support')
        .setVersion('1.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            'JWT-auth',
        )
        .addTag('Auth', 'Authentication endpoints')
        .addTag('Users', 'User management')
        .addTag('Organizations', 'Organization management')
        .addTag('Entities', 'Property owner entities')
        .addTag('Properties', 'Property management')
        .addTag('Spaces', 'Space/Unit management')
        .addTag('Leases', 'Lease management')
        .addTag('Financials', 'Financial management')
        .addTag('Maintenance', 'Maintenance requests')
        .addTag('Reports', 'Reporting and analytics')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });

    // Enable graceful shutdown
    app.enableShutdownHooks();

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`🚀 Property Management System API running on: http://localhost:${port}`);
    console.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
});