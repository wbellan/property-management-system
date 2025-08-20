// src/users/users.service.ts
import { PrismaService } from '../prisma/prisma.service';
import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface InviteUserData {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    entityIds?: string[];
    propertyIds?: string[];
}

export interface SetupOrganizationData {
    organizationName: string;
    adminUser: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
    };
    initialEntity?: {
        name: string;
        type: string;
    };
}

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService
    ) { }

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

    // Initial organization setup
    async setupOrganization(dto: SetupOrganizationData) {
        // Check if organization name is taken
        const existingOrg = await this.prisma.organization.findFirst({
            where: { name: dto.organizationName }
        });

        if (existingOrg) {
            throw new ConflictException('Organization name already exists');
        }

        // Check if admin email is taken
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.adminUser.email }
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        return this.prisma.$transaction(async (tx) => {
            // Create organization
            const organization = await tx.organization.create({
                data: {
                    name: dto.organizationName,
                    address: '',
                    email: dto.adminUser.email,
                    phone: '',
                }
            });

            // Create admin user
            const hashedPassword = await bcrypt.hash(dto.adminUser.password, 10);
            const adminUser = await tx.user.create({
                data: {
                    email: dto.adminUser.email,
                    firstName: dto.adminUser.firstName,
                    lastName: dto.adminUser.lastName,
                    passwordHash: hashedPassword,
                    role: UserRole.ORG_ADMIN,
                    status: UserStatus.ACTIVE,
                    organizationId: organization.id,
                    emailVerified: true,
                }
            });

            // Create initial entity if provided
            let entity = null;
            if (dto.initialEntity) {
                entity = await tx.entity.create({
                    data: {
                        name: dto.initialEntity.name,
                        entityType: dto.initialEntity.type,
                        organizationId: organization.id,
                    }
                });

                // Give admin user access to the entity
                await tx.userEntity.create({
                    data: {
                        userId: adminUser.id,
                        entityId: entity.id,
                    }
                });
            }

            return {
                organization,
                adminUser: {
                    id: adminUser.id,
                    email: adminUser.email,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName,
                    role: adminUser.role,
                },
                entity,
            };
        });
    }

    // Invite user with role
    async inviteUser(inviterUserId: string, dto: InviteUserData) {
        const inviter = await this.prisma.user.findUnique({
            where: { id: inviterUserId },
            include: { organization: true }
        });

        if (!inviter) {
            throw new NotFoundException('Inviter not found');
        }

        // Check if email is already registered
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email }
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Generate invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        return this.prisma.$transaction(async (tx) => {
            // Create user with invite token
            const user = await tx.user.create({
                data: {
                    email: dto.email,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    passwordHash: '', // Will be set when invitation is completed
                    role: dto.role,
                    status: UserStatus.PENDING,
                    organizationId: inviter.organizationId,
                    inviteToken,
                    inviteExpires,
                    invitedBy: inviterUserId,
                }
            });

            // Add entity access if specified
            if (dto.entityIds?.length) {
                await tx.userEntity.createMany({
                    data: dto.entityIds.map(entityId => ({
                        userId: user.id,
                        entityId,
                    }))
                });
            }

            // Add property access if specified
            if (dto.propertyIds?.length) {
                await tx.userProperty.createMany({
                    data: dto.propertyIds.map(propertyId => ({
                        userId: user.id,
                        propertyId,
                    }))
                });
            }

            // Send invitation email
            await this.emailService.sendInvitation({
                to: dto.email,
                firstName: dto.firstName,
                inviterName: `${inviter.firstName} ${inviter.lastName}`,
                organizationName: inviter.organization.name,
                inviteToken,
                role: dto.role,
            });

            return {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                inviteToken,
            };
        });
    }

    // Complete user invitation (set password)
    async completeInvitation(inviteToken: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { inviteToken }
        });

        if (!user) {
            throw new BadRequestException('Invalid invitation token');
        }

        if (!user.inviteExpires || user.inviteExpires < new Date()) {
            throw new BadRequestException('Invitation token has expired');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        return this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                inviteToken: null,
                inviteExpires: null,
                status: UserStatus.ACTIVE,
                emailVerified: true,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                organizationId: true,
            }
        });
    }

    // Get users in organization
    async getUsersInOrganization(organizationId: string, page = 1, limit = 50) {
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where: { organizationId },
                include: {
                    userEntities: {
                        include: { entity: true }
                    },
                    userProperties: {
                        include: { property: true }
                    },
                    tenantProfile: true,
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.user.count({
                where: { organizationId }
            })
        ]);

        return {
            data: users.map(user => ({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                status: user.status,
                emailVerified: user.emailVerified,
                lastLoginAt: user.lastLoginAt,
                isPendingInvite: !!user.inviteToken,
                entities: user.userEntities.map(ue => ue.entity),
                properties: user.userProperties.map(up => up.property),
                tenantProfile: user.tenantProfile,
                createdAt: user.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            }
        };
    }

    // Update user role and access
    async updateUserAccess(
        userId: string,
        updates: {
            role?: UserRole;
            status?: UserStatus;
            entityIds?: string[];
            propertyIds?: string[];
        }
    ) {
        return this.prisma.$transaction(async (tx) => {
            // Update basic user info
            const user = await tx.user.update({
                where: { id: userId },
                data: {
                    role: updates.role,
                    status: updates.status,
                }
            });

            // Update entity access
            if (updates.entityIds !== undefined) {
                await tx.userEntity.deleteMany({
                    where: { userId }
                });

                if (updates.entityIds.length > 0) {
                    await tx.userEntity.createMany({
                        data: updates.entityIds.map(entityId => ({
                            userId,
                            entityId,
                        }))
                    });
                }
            }

            // Update property access
            if (updates.propertyIds !== undefined) {
                await tx.userProperty.deleteMany({
                    where: { userId }
                });

                if (updates.propertyIds.length > 0) {
                    await tx.userProperty.createMany({
                        data: updates.propertyIds.map(propertyId => ({
                            userId,
                            propertyId,
                        }))
                    });
                }
            }

            return user;
        });
    }

    // Resend invitation
    async resendInvitation(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.status === UserStatus.ACTIVE) {
            throw new BadRequestException('User has already completed registration');
        }

        // Generate new invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                inviteToken,
                inviteExpires,
            }
        });

        // Send new invitation email
        await this.emailService.sendInvitation({
            to: user.email,
            firstName: user.firstName,
            organizationName: user.organization.name,
            inviteToken,
            role: user.role,
        });

        return { success: true };
    }

    // Deactivate user
    async deactivateUser(userId: string) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { status: UserStatus.INACTIVE }
        });
    }

    // Get available entities and properties for role assignment
    async getAccessOptions(organizationId: string) {
        const [entities, properties] = await Promise.all([
            this.prisma.entity.findMany({
                where: { organizationId },
                select: { id: true, name: true, entityType: true }
            }),
            this.prisma.property.findMany({
                where: { entity: { organizationId } },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    entity: { select: { name: true } }
                }
            })
        ]);

        return { entities, properties };
    }
}