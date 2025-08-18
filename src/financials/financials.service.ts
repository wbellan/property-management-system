// src/financials/financials.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinancialsService {
    constructor(private prisma: PrismaService) { }
    // TODO: Implement financial management logic
}
