// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { EntitiesModule } from './entities/entities.module';
import { PropertiesModule } from './properties/properties.module';
import { SpacesModule } from './spaces/spaces.module';
import { LeasesModule } from './leases/leases.module';
import { FinancialsModule } from './financials/financials.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { ReportsModule } from './reports/reports.module';
import { TenantsModule } from './tenants/tenants.module';
import { EmailModule } from './email/email.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),

        // Rate limiting
        ThrottlerModule.forRootAsync({
            useFactory: () => ([{
                ttl: parseInt(process.env.THROTTLE_TTL) || 60000, // milliseconds
                limit: parseInt(process.env.THROTTLE_LIMIT) || 10,
            }]),
        }),

        // Core modules
        PrismaModule,
        AuthModule,
        UsersModule,

        // Business modules
        OrganizationsModule,
        EntitiesModule,
        PropertiesModule,
        SpacesModule,
        LeasesModule,
        FinancialsModule,
        MaintenanceModule,
        ReportsModule,
        TenantsModule,
        EmailModule,
        TasksModule
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }