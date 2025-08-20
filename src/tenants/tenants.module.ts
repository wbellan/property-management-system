// src/tenants/tenants.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        UsersModule,
        EmailModule,
    ],
    controllers: [TenantsController],
    providers: [TenantsService],
    exports: [TenantsService],
})
export class TenantsModule { }