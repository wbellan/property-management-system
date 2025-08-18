// src/leases/leases.controller.ts
import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeasesService } from './leases.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Leases')
@Controller('leases')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LeasesController {
    constructor(private readonly leasesService: LeasesService) { }
    // TODO: Implement lease endpoints
}