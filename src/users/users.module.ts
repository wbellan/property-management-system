// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        EmailModule,
    ],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }