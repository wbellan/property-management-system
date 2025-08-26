// src/entities/entities.module.ts
import { Module } from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { EntitiesController } from './entities.controller';
import { EinVerificationService } from './ein-verification.service';

@Module({
    controllers: [EntitiesController],
    providers: [EntitiesService, EinVerificationService],
    exports: [EntitiesService],
})
export class EntitiesModule { }