// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            log: ['query', 'info', 'warn', 'error'],
            errorFormat: 'pretty',
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    // Helper method for transactions
    async executeTransaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
        return this.$transaction(fn);
    }

    // Soft delete helper (if you want to implement soft deletes)
    async softDelete(model: string, id: string) {
        const modelName = model.toLowerCase();
        return (this as any)[modelName].update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    // Helper for pagination
    async paginate<T>(
        model: any,
        args: {
            page?: number;
            limit?: number;
            where?: any;
            include?: any;
            orderBy?: any;
        },
    ) {
        const { page = 1, limit = 10, where = {}, include = {}, orderBy = {} } = args;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            model.findMany({
                where,
                include,
                orderBy,
                skip,
                take: limit,
            }),
            model.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }
}