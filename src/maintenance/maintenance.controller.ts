// src/maintenance/maintenance.controller.ts
import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Maintenance')
@Controller('maintenance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MaintenanceController {
    constructor(private readonly maintenanceService: MaintenanceService) { }
    // TODO: Implement maintenance endpoints
}