import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBankLedgerDto, UpdateBankLedgerDto } from '../dto/create-bank-ledger.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BankLedgerService {
    constructor(private readonly prisma: PrismaService) { }

    async create(entityId: string, dto: CreateBankLedgerDto, userId: string) {
        // Verify entity exists
        const entity = await this.prisma.entity.findFirst({
            where: { id: entityId },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found or access denied');
        }

        // Check for duplicate account number within entity
        if (dto.accountNumber) {
            const existingAccount = await this.prisma.bankLedger.findFirst({
                where: {
                    entityId,
                    accountNumber: dto.accountNumber,
                    isActive: true,
                },
            });

            if (existingAccount) {
                throw new BadRequestException('Account number already exists for this entity');
            }
        }

        return this.prisma.bankLedger.create({
            data: {
                entityId,
                accountName: dto.accountName,
                accountNumber: dto.accountNumber,
                bankName: dto.bankName,
                accountType: dto.accountType,
                routingNumber: dto.routingNumber,
                notes: dto.notes,
                currentBalance: new Decimal(0),
                isActive: true,
            },
            include: {
                entity: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    async findAllByEntity(entityId: string, includeInactive = false) {
        const entity = await this.prisma.entity.findUnique({
            where: { id: entityId },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        return this.prisma.bankLedger.findMany({
            where: {
                entityId,
                ...(includeInactive ? {} : { isActive: true }),
            },
            include: {
                entity: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        ledgerEntries: true,
                    },
                },
            },
            orderBy: {
                accountName: 'asc',
            },
        });
    }

    async findOne(entityId: string, id: string) {
        const bankLedger = await this.prisma.bankLedger.findFirst({
            where: {
                id,
                entityId,
            },
            include: {
                entity: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                ledgerEntries: {
                    take: 10,
                    orderBy: {
                        transactionDate: 'desc',
                    },
                    include: {
                        chartAccount: {
                            select: {
                                accountCode: true,
                                accountName: true,
                            },
                        },
                    },
                },
            },
        });

        if (!bankLedger) {
            throw new NotFoundException('Bank ledger not found');
        }

        return bankLedger;
    }

    async update(entityId: string, id: string, dto: UpdateBankLedgerDto) {
        const existingLedger = await this.prisma.bankLedger.findFirst({
            where: {
                id,
                entityId,
            },
        });

        if (!existingLedger) {
            throw new NotFoundException('Bank ledger not found');
        }

        // Check for duplicate account number if updating
        if (dto.accountNumber && dto.accountNumber !== existingLedger.accountNumber) {
            const duplicateAccount = await this.prisma.bankLedger.findFirst({
                where: {
                    entityId,
                    accountNumber: dto.accountNumber,
                    id: { not: id },
                    isActive: true,
                },
            });

            if (duplicateAccount) {
                throw new BadRequestException('Account number already exists for this entity');
            }
        }

        return this.prisma.bankLedger.update({
            where: { id },
            data: {
                ...dto,
                updatedAt: new Date(),
            },
            include: {
                entity: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    async deactivate(entityId: string, id: string) {
        const bankLedger = await this.prisma.bankLedger.findFirst({
            where: {
                id,
                entityId,
            },
        });

        if (!bankLedger) {
            throw new NotFoundException('Bank ledger not found');
        }

        return this.prisma.bankLedger.update({
            where: { id },
            data: {
                isActive: false,
                updatedAt: new Date(),
            },
        });
    }

    async getCurrentBalance(entityId: string, bankLedgerId: string): Promise<Decimal> {
        const bankLedger = await this.prisma.bankLedger.findFirst({
            where: {
                id: bankLedgerId,
                entityId,
            },
        });

        if (!bankLedger) {
            throw new NotFoundException('Bank ledger not found');
        }

        return bankLedger.currentBalance;
    }

    async updateBalance(bankLedgerId: string, amount: Decimal, operation: 'ADD' | 'SUBTRACT') {
        const currentLedger = await this.prisma.bankLedger.findUnique({
            where: { id: bankLedgerId },
        });

        if (!currentLedger) {
            throw new NotFoundException('Bank ledger not found');
        }

        const newBalance = operation === 'ADD'
            ? currentLedger.currentBalance.plus(amount)
            : currentLedger.currentBalance.minus(amount);

        return this.prisma.bankLedger.update({
            where: { id: bankLedgerId },
            data: {
                currentBalance: newBalance,
                updatedAt: new Date(),
            },
        });
    }

    async recalculateBalance(entityId: string, bankLedgerId: string) {
        const bankLedger = await this.prisma.bankLedger.findFirst({
            where: {
                id: bankLedgerId,
                entityId,
            },
        });

        if (!bankLedger) {
            throw new NotFoundException('Bank ledger not found');
        }

        // We'll implement this once ledger entries are working
        return bankLedger.currentBalance;
    }
}