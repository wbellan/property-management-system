// src/maintenance/maintenance.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
    constructor(private prisma: PrismaService) { }
    // TODO: Implement maintenance request logic
}