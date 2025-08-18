// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    // Basic user service - will expand as needed
    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async findById(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
            include: {
                organization: true,
                userEntities: {
                    include: {
                        entity: true,
                    },
                },
                userProperties: {
                    include: {
                        property: true,
                    },
                },
            },
        });
    }
}