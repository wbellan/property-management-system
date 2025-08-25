// src/tasks/lease-cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LeaseStatus } from '@prisma/client';

@Injectable()
export class LeaseCleanupService {
    private readonly logger = new Logger(LeaseCleanupService.name);

    constructor(private prisma: PrismaService) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // Runs daily at midnight
    async updateExpiredLeases() {
        this.logger.log('Starting expired lease cleanup...');

        try {
            const result = await this.prisma.lease.updateMany({
                where: {
                    status: LeaseStatus.ACTIVE,
                    endDate: {
                        lt: new Date() // End date is before today
                    }
                },
                data: {
                    status: LeaseStatus.EXPIRED
                }
            });

            this.logger.log(`Updated ${result.count} expired leases`);

            if (result.count > 0) {
                // Optionally log which leases were updated
                const updatedLeases = await this.prisma.lease.findMany({
                    where: {
                        status: LeaseStatus.EXPIRED,
                        endDate: {
                            lt: new Date(),
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
                        }
                    },
                    include: {
                        space: {
                            include: {
                                property: true
                            }
                        },
                        tenant: true
                    }
                });

                updatedLeases.forEach(lease => {
                    this.logger.log(`Expired lease: ${lease.space.property.name} - ${lease.space.name} (${lease.tenant.firstName} ${lease.tenant.lastName})`);
                });
            }
        } catch (error) {
            this.logger.error('Failed to update expired leases:', error);
        }
    }

    // Manual trigger method for testing
    async manualCleanup(): Promise<number> {
        this.logger.log('Manual expired lease cleanup triggered...');

        const result = await this.prisma.lease.updateMany({
            where: {
                status: LeaseStatus.ACTIVE,
                endDate: {
                    lt: new Date()
                }
            },
            data: {
                status: LeaseStatus.EXPIRED
            }
        });

        this.logger.log(`Manually updated ${result.count} expired leases`);
        return result.count;
    }
}