// src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LeaseCleanupService } from './lease-cleanup.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [ScheduleModule.forRoot(), PrismaModule],
    providers: [LeaseCleanupService],
    exports: [LeaseCleanupService],
})
export class TasksModule { }