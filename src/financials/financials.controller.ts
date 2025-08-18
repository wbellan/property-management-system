// src/financials/financials.controller.ts
import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FinancialsService } from './financials.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Financials')
@Controller('financials')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FinancialsController {
    constructor(private readonly financialsService: FinancialsService) { }
    // TODO: Implement financial endpoints
}