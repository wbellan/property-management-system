// src/users/users.service.ts
import { PrismaService } from '../prisma/prisma.service';
import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserAccessDto } from './dto/update-user-access.dto';

export interface InviteUserDto {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    entityIds?: string[];
    propertyIds?: string[];
}

export interface SetupOrganizationDto {
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
    async setupOrganization(dto: SetupOrganizationDto) {
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
    async inviteUser(inviterUserId: string, dto: InviteUserDto) {
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

    // Get users in organization (UPDATED WITH SECURITY)
    async getUsersInOrganization(
        organizationId: string,
        page = 1,
        limit = 50,
        userRole?: UserRole,
        currentUserOrgId?: string
    ) {
        // Security check: ensure user can only access their own organization's users
        if (userRole !== UserRole.SUPER_ADMIN && organizationId !== currentUserOrgId) {
            throw new ForbiddenException('Access denied to this organization');
        }

        const skip = (page - 1) * limit;

        try {
            const [users, total] = await Promise.all([
                this.prisma.user.findMany({
                    where: { organizationId },
                    include: {
                        userEntities: {
                            include: {
                                entity: {
                                    select: {
                                        id: true,
                                        name: true,
                                        entityType: true,
                                    }
                                }
                            }
                        },
                        userProperties: {
                            include: {
                                property: {
                                    select: {
                                        id: true,
                                        name: true,
                                        address: true,
                                    }
                                }
                            }
                        },
                        tenantProfile: {
                            select: {
                                id: true,
                                businessName: true
                            }
                        },
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.user.count({
                    where: { organizationId }
                })
            ]);

            // Format response to match frontend expectations
            const formattedUsers = users.map(user => {
                const { passwordHash, inviteToken, inviteExpires, userEntities, userProperties, ...userWithoutSensitive } = user;
                return {
                    ...userWithoutSensitive,
                    entities: userEntities ? userEntities.map(ue => ue.entity) : [],
                    properties: userProperties ? userProperties.map(up => up.property) : [],
                    isPendingInvite: !!inviteToken, // Use the destructured inviteToken
                };
            });

            return {
                success: true,
                data: formattedUsers,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                }
            };
        } catch (error) {
            console.error('Error fetching users by organization:', error);
            throw new NotFoundException('Organization not found or no users exist');
        }
    }

    // Update user role and access
    async updateUserAccess(
        userId: string,
        updateAccessDto: UpdateUserAccessDto,
        currentUserRole: UserRole,
        currentUserOrgId: string,
        currentUserEntityIds: string[]
    ) {
        // First, get the user to update and verify permissions
        const userToUpdate = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                organization: true,
                entities: true,
                properties: true
            }
        });

        if (!userToUpdate) {
            throw new NotFoundException('User not found');
        }

        // Verify organization access
        if (currentUserRole !== UserRole.SUPER_ADMIN && userToUpdate.organizationId !== currentUserOrgId) {
            throw new ForbiddenException('Cannot modify users from other organizations');
        }

        // Verify role hierarchy permissions
        this.validateRoleChangePermissions(currentUserRole, userToUpdate.role, updateAccessDto.role);

        // Verify entity access permissions
        if (updateAccessDto.entityIds?.length > 0) {
            await this.validateEntityAccess(updateAccessDto.entityIds, currentUserRole, currentUserOrgId, currentUserEntityIds);
        }

        // Verify property access permissions
        if (updateAccessDto.propertyIds?.length > 0) {
            await this.validatePropertyAccess(updateAccessDto.propertyIds, currentUserRole, currentUserOrgId, currentUserEntityIds);
        }

        // Update user in transaction
        return await this.prisma.$transaction(async (tx) => {
            // Update basic user info
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    role: updateAccessDto.role,
                    status: updateAccessDto.status,
                }
            });

            // Clear existing entity relationships
            await tx.user.update({
                where: { id: userId },
                data: {
                    entities: {
                        set: [] // Clear all existing relationships
                    }
                }
            });

            // Clear existing property relationships
            await tx.user.update({
                where: { id: userId },
                data: {
                    properties: {
                        set: [] // Clear all existing relationships
                    }
                }
            });

            // Add new entity relationships
            if (updateAccessDto.entityIds?.length > 0) {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        entities: {
                            connect: updateAccessDto.entityIds.map(id => ({ id }))
                        }
                    }
                });
            }

            // Add new property relationships
            if (updateAccessDto.propertyIds?.length > 0) {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        properties: {
                            connect: updateAccessDto.propertyIds.map(id => ({ id }))
                        }
                    }
                });
            }

            // Return updated user with relationships
            return await tx.user.findUnique({
                where: { id: userId },
                include: {
                    entities: {
                        select: {
                            id: true,
                            name: true,
                            entityType: true
                        }
                    },
                    properties: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            entityId: true
                        }
                    }
                }
            });
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
    async create(createUserDto: CreateUserDto) {
        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

        return this.prisma.$transaction(async (tx) => {
            // Create user
            const user = await tx.user.create({
                data: {
                    email: createUserDto.email,
                    firstName: createUserDto.firstName,
                    lastName: createUserDto.lastName,
                    passwordHash: hashedPassword,
                    role: createUserDto.role,
                    organizationId: createUserDto.organizationId,
                    phone: createUserDto.phone,
                    status: UserStatus.ACTIVE,
                    emailVerified: true,
                },
                include: {
                    organization: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            // Add entity access if specified
            if (createUserDto.entityIds?.length) {
                await tx.userEntity.createMany({
                    data: createUserDto.entityIds.map(entityId => ({
                        userId: user.id,
                        entityId,
                    }))
                });
            }

            // Add property access if specified
            if (createUserDto.propertyIds?.length) {
                await tx.userProperty.createMany({
                    data: createUserDto.propertyIds.map(propertyId => ({
                        userId: user.id,
                        propertyId,
                    }))
                });
            }

            // Remove password hash from response
            const { passwordHash, ...userWithoutPassword } = user;
            return {
                success: true,
                data: userWithoutPassword
            };
        });
    }

    async findAll(query: any = {}) {
        const users = await this.prisma.user.findMany({
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                userEntities: {
                    include: {
                        entity: {
                            select: {
                                id: true,
                                name: true,
                                entityType: true,
                            },
                        },
                    },
                },
                userProperties: {
                    include: {
                        property: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
                            },
                        },
                    },
                },
            },
        });

        // Remove password hashes and format response
        const formattedUsers = users.map(user => {
            const { passwordHash, inviteToken, inviteExpires, ...userWithoutSensitive } = user;
            return {
                ...userWithoutSensitive,
                entities: user.userEntities.map(ue => ue.entity),
                properties: user.userProperties.map(up => up.property),
            };
        });

        return {
            success: true,
            data: formattedUsers
        };
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            throw new NotFoundException('User not found');
        }

        return this.prisma.$transaction(async (tx) => {
            // Prepare update data
            const updateData: any = { ...updateUserDto };

            // Hash password if provided
            if (updateUserDto.password) {
                updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 12);
                delete updateData.password;
            }

            // Remove access arrays from user update
            delete updateData.entityIds;
            delete updateData.propertyIds;

            // Update user
            const user = await tx.user.update({
                where: { id },
                data: updateData,
                include: {
                    organization: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            // Update entity access if specified
            if (updateUserDto.entityIds !== undefined) {
                await tx.userEntity.deleteMany({
                    where: { userId: id }
                });

                if (updateUserDto.entityIds.length > 0) {
                    await tx.userEntity.createMany({
                        data: updateUserDto.entityIds.map(entityId => ({
                            userId: id,
                            entityId,
                        }))
                    });
                }
            }

            // Update property access if specified
            if (updateUserDto.propertyIds !== undefined) {
                await tx.userProperty.deleteMany({
                    where: { userId: id }
                });

                if (updateUserDto.propertyIds.length > 0) {
                    await tx.userProperty.createMany({
                        data: updateUserDto.propertyIds.map(propertyId => ({
                            userId: id,
                            propertyId,
                        }))
                    });
                }
            }

            // Remove password hash from response
            const { passwordHash, inviteToken, inviteExpires, ...userWithoutSensitive } = user;
            return {
                success: true,
                data: userWithoutSensitive
            };
        });
    }

    async remove(id: string) {
        const existingUser = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            throw new NotFoundException('User not found');
        }

        return this.prisma.$transaction(async (tx) => {
            // Remove user access relationships first
            await tx.userEntity.deleteMany({
                where: { userId: id }
            });

            await tx.userProperty.deleteMany({
                where: { userId: id }
            });

            // Delete the user
            await tx.user.delete({
                where: { id },
            });

            return {
                success: true,
                message: 'User deleted successfully'
            };
        });
    }
    async getUserAccess(
        userId: string,
        currentUserRole: UserRole,
        currentUserOrgId: string,
        currentUserEntityIds: string[]
    ) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                entities: {
                    select: {
                        id: true,
                        name: true,
                        entityType: true
                    }
                },
                properties: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        entityId: true
                    }
                }
            }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify access permissions
        if (currentUserRole !== UserRole.SUPER_ADMIN && user.organizationId !== currentUserOrgId) {
            throw new ForbiddenException('Cannot access users from other organizations');
        }

        return user;
    }

    async getEntitiesAndProperties(
        organizationId: string,
        currentUserRole: UserRole,
        currentUserOrgId: string,
        currentUserEntityIds: string[]
    ) {
        // Verify organization access
        if (currentUserRole !== UserRole.SUPER_ADMIN && organizationId !== currentUserOrgId) {
            throw new ForbiddenException('Cannot access other organizations');
        }

        let entityFilter = {};
        let propertyFilter = {};

        // Apply entity-level filtering for ENTITY_MANAGER role
        if (currentUserRole === UserRole.ENTITY_MANAGER) {
            entityFilter = {
                id: {
                    in: currentUserEntityIds
                }
            };
            propertyFilter = {
                entityId: {
                    in: currentUserEntityIds
                }
            };
        } else {
            // For ORG_ADMIN and SUPER_ADMIN, show all entities/properties in the organization
            entityFilter = {
                organizationId: organizationId
            };
            propertyFilter = {
                entity: {
                    organizationId: organizationId
                }
            };
        }

        const [entities, properties] = await Promise.all([
            this.prisma.entity.findMany({
                where: entityFilter,
                select: {
                    id: true,
                    name: true,
                    entityType: true
                },
                orderBy: {
                    name: 'asc'
                }
            }),
            this.prisma.property.findMany({
                where: propertyFilter,
                select: {
                    id: true,
                    name: true,
                    address: true,
                    entityId: true
                },
                orderBy: {
                    name: 'asc'
                }
            })
        ]);

        return {
            entities,
            properties
        };
    }

    private validateRoleChangePermissions(
        currentUserRole: UserRole,
        targetCurrentRole: UserRole,
        targetNewRole: UserRole
    ) {
        // Define role hierarchy and permissions
        const roleHierarchy = {
            [UserRole.SUPER_ADMIN]: [
                UserRole.ORG_ADMIN,
                UserRole.ENTITY_MANAGER,
                UserRole.PROPERTY_MANAGER,
                UserRole.ACCOUNTANT,
                UserRole.MAINTENANCE,
                UserRole.TENANT
            ],
            [UserRole.ORG_ADMIN]: [
                UserRole.ENTITY_MANAGER,
                UserRole.PROPERTY_MANAGER,
                UserRole.ACCOUNTANT,
                UserRole.MAINTENANCE,
                UserRole.TENANT
            ],
            [UserRole.ENTITY_MANAGER]: [
                UserRole.PROPERTY_MANAGER,
                UserRole.ACCOUNTANT,
                UserRole.MAINTENANCE,
                UserRole.TENANT
            ],
            [UserRole.PROPERTY_MANAGER]: [
                UserRole.TENANT
            ]
        };

        const allowedRoles = roleHierarchy[currentUserRole] || [];

        // Check if current user can modify the target user's current role
        if (currentUserRole !== UserRole.SUPER_ADMIN && !allowedRoles.includes(targetCurrentRole)) {
            throw new ForbiddenException('Insufficient permissions to modify this user');
        }

        // Check if current user can assign the new role
        if (currentUserRole !== UserRole.SUPER_ADMIN && !allowedRoles.includes(targetNewRole)) {
            throw new ForbiddenException('Insufficient permissions to assign this role');
        }
    }

    private async validateEntityAccess(
        entityIds: string[],
        currentUserRole: UserRole,
        currentUserOrgId: string,
        currentUserEntityIds: string[]
    ) {
        // Verify all entities exist and belong to the same organization
        const entities = await this.prisma.entity.findMany({
            where: {
                id: {
                    in: entityIds
                }
            },
            select: {
                id: true,
                organizationId: true
            }
        });

        if (entities.length !== entityIds.length) {
            throw new BadRequestException('One or more entities not found');
        }

        // Verify all entities belong to the current user's organization
        const invalidEntities = entities.filter(entity => entity.organizationId !== currentUserOrgId);
        if (invalidEntities.length > 0) {
            throw new ForbiddenException('Cannot assign entities from other organizations');
        }

        // For ENTITY_MANAGER, verify they can only assign entities they have access to
        if (currentUserRole === UserRole.ENTITY_MANAGER) {
            const unauthorizedEntities = entityIds.filter(id => !currentUserEntityIds.includes(id));
            if (unauthorizedEntities.length > 0) {
                throw new ForbiddenException('Cannot assign entities you do not have access to');
            }
        }
    }

    private async validatePropertyAccess(
        propertyIds: string[],
        currentUserRole: UserRole,
        currentUserOrgId: string,
        currentUserEntityIds: string[]
    ) {
        // Verify all properties exist and belong to entities in the same organization
        const properties = await this.prisma.property.findMany({
            where: {
                id: {
                    in: propertyIds
                }
            },
            include: {
                entity: {
                    select: {
                        id: true,
                        organizationId: true
                    }
                }
            }
        });

        if (properties.length !== propertyIds.length) {
            throw new BadRequestException('One or more properties not found');
        }

        // Verify all properties belong to entities in the current user's organization
        const invalidProperties = properties.filter(property => property.entity.organizationId !== currentUserOrgId);
        if (invalidProperties.length > 0) {
            throw new ForbiddenException('Cannot assign properties from other organizations');
        }

        // For ENTITY_MANAGER, verify they can only assign properties from entities they have access to
        if (currentUserRole === UserRole.ENTITY_MANAGER) {
            const unauthorizedProperties = properties.filter(property => !currentUserEntityIds.includes(property.entityId));
            if (unauthorizedProperties.length > 0) {
                throw new ForbiddenException('Cannot assign properties from entities you do not have access to');
            }
        }
    }
}