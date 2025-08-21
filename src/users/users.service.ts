// src/users/users.service.ts
import { PrismaService } from '../prisma/prisma.service';
import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { InvitationStatus, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserAccessDto } from './dto/update-user-access.dto';
import { CompleteInvitationDto } from './dto/complete-invitation.dto';
import { InviteUserDto } from './dto/invite-user.dto';

// export interface InviteUserDto {
//     email: string;
//     firstName: string;
//     lastName: string;
//     role: UserRole;
//     entityIds?: string[];
//     propertyIds?: string[];
// }

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

    /**
       * Send user invitation with email
       */
    async inviteUser(
        inviteData: InviteUserDto,
        invitedById: string,
        inviterOrgId: string,
        inviterRole: UserRole,
        inviterEntityIds: string[]
    ) {
        console.log('Invite data received:', {
            inviteData,
            invitedById,
            inviterOrgId,
            inviterRole,
            inviterEntityIds
        });

        // 1. Validate inviter permissions
        await this.validateInvitePermissions(inviteData.role, inviterRole);

        // 2. Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: inviteData.email }
        });

        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        // 3. Check for existing pending invitation
        const existingInvitation = await this.prisma.userInvitation.findFirst({
            where: {
                email: inviteData.email,
                status: InvitationStatus.PENDING,
                expiresAt: { gt: new Date() }
            }
        });

        if (existingInvitation) {
            throw new BadRequestException('Pending invitation already exists for this email');
        }

        // 4. Validate entity/property access
        if (inviteData.entityIds?.length > 0) {
            await this.validateEntityAccess(inviteData.entityIds, inviterRole, inviterOrgId, inviterEntityIds);
        }

        if (inviteData.propertyIds?.length > 0) {
            await this.validatePropertyAccess(inviteData.propertyIds, inviterRole, inviterOrgId, inviterEntityIds);
        }

        // 5. Verify organization and inviter exist
        const organization = await this.prisma.organization.findUnique({
            where: { id: inviterOrgId },
            select: { id: true, name: true }
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        const inviter = await this.prisma.user.findUnique({
            where: { id: invitedById },
            select: { id: true, firstName: true, lastName: true }
        });

        if (!inviter) {
            throw new NotFoundException('Inviter user not found');
        }

        // 6. Generate secure invitation token
        const inviteToken = this.generateInviteToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        console.log('Creating invitation with:', {
            firstName: inviteData.firstName,
            lastName: inviteData.lastName,
            email: inviteData.email,
            role: inviteData.role,
            organizationId: inviterOrgId,
            invitedById,
            token: inviteToken,
            entityIds: inviteData.entityIds || [],
            propertyIds: inviteData.propertyIds || [],
            expiresAt,
            status: InvitationStatus.PENDING
        });

        // 7. Create invitation record (FIXED - proper relationship handling)
        const invitation = await this.prisma.userInvitation.create({
            data: {
                firstName: inviteData.firstName,
                lastName: inviteData.lastName,
                email: inviteData.email,
                role: inviteData.role,
                organizationId: inviterOrgId, // Make sure this is not undefined
                invitedById: invitedById,     // Make sure this is not undefined
                token: inviteToken,
                entityIds: inviteData.entityIds || [],
                propertyIds: inviteData.propertyIds || [],
                expiresAt,
                status: InvitationStatus.PENDING
            },
            include: {
                invitedBy: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                },
                organization: {
                    select: {
                        name: true
                    }
                }
            }
        });

        console.log('Invitation created successfully:', invitation.id);

        // 8. Send invitation email
        try {
            await this.emailService.sendInvitation({
                to: invitation.email,
                firstName: invitation.firstName,
                inviterName: `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`,
                organizationName: invitation.organization.name,
                inviteToken: invitation.token,
                role: invitation.role
            });
            console.log('Invitation email sent successfully');
        } catch (emailError) {
            // Log email error but don't fail the invitation creation
            console.error('Failed to send invitation email:', emailError);
            // In production, you might want to queue this for retry
        }

        return {
            id: invitation.id,
            email: invitation.email,
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
            createdAt: invitation.createdAt
        };
    }

    /**
  * Validate invitation token
  */
    async validateInvitation(token: string) {
        const invitation = await this.prisma.userInvitation.findUnique({
            where: { token },
            include: {
                organization: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!invitation) {
            throw new NotFoundException('Invalid invitation token');
        }

        if (invitation.status !== InvitationStatus.PENDING) {
            throw new BadRequestException('Invitation has already been used or cancelled');
        }

        if (invitation.expiresAt < new Date()) {
            // Mark as expired
            await this.prisma.userInvitation.update({
                where: { id: invitation.id },
                data: { status: InvitationStatus.EXPIRED }
            });
            throw new BadRequestException('Invitation has expired');
        }

        return {
            id: invitation.id,
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            email: invitation.email,
            role: invitation.role,
            organizationName: invitation.organization.name,
            expiresAt: invitation.expiresAt
        };
    }

    /**
   * Complete invitation by creating user account
   */
    async completeInvitation(completeData: CompleteInvitationDto) {
        // 1. Validate invitation with organization details
        const invitation = await this.prisma.userInvitation.findUnique({
            where: { token: completeData.token },
            include: {
                organization: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!invitation) {
            throw new NotFoundException('Invalid invitation token');
        }

        if (invitation.status !== InvitationStatus.PENDING) {
            throw new BadRequestException('Invitation has already been used or cancelled');
        }

        if (invitation.expiresAt < new Date()) {
            // Mark as expired
            await this.prisma.userInvitation.update({
                where: { id: invitation.id },
                data: { status: InvitationStatus.EXPIRED }
            });
            throw new BadRequestException('Invitation has expired');
        }

        // 2. Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: invitation.email }
        });

        if (existingUser) {
            throw new BadRequestException('User account already exists');
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(completeData.password, 12);

        // 4. Create user and update invitation in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Create user
            const newUser = await tx.user.create({
                data: {
                    email: invitation.email,
                    firstName: invitation.firstName,
                    lastName: invitation.lastName,
                    passwordHash: hashedPassword,
                    role: invitation.role,
                    organizationId: invitation.organizationId,
                    emailVerified: true, // Since they completed invitation
                    status: 'ACTIVE'
                }
            });

            // Connect entities if specified
            if (invitation.entityIds.length > 0) {
                await tx.user.update({
                    where: { id: newUser.id },
                    data: {
                        entities: {
                            connect: invitation.entityIds.map(id => ({ id }))
                        }
                    }
                });
            }

            // Connect properties if specified
            if (invitation.propertyIds.length > 0) {
                await tx.user.update({
                    where: { id: newUser.id },
                    data: {
                        properties: {
                            connect: invitation.propertyIds.map(id => ({ id }))
                        }
                    }
                });
            }

            // Mark invitation as completed
            await tx.userInvitation.update({
                where: { id: invitation.id },
                data: { status: InvitationStatus.COMPLETED }
            });

            return newUser;
        });

        // 5. Send welcome email (FIXED - use invitation.organization.name)
        try {
            await this.emailService.sendWelcomeEmail({
                to: result.email,
                firstName: result.firstName,
                organizationName: invitation.organization?.name || 'PropFlow'
            });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }

        return {
            id: result.id,
            email: result.email,
            firstName: result.firstName,
            lastName: result.lastName,
            role: result.role,
            message: 'Account created successfully'
        };
    }


    // Get users in organization (UPDATED WITH SECURITY)
    async getUsersInOrganization(
        organizationId: string,
        page = 1,
        limit = 50,
        userRole?: UserRole,
        currentUserOrgId?: string
    ) {

        console.log('In getUsersInOrganization', organizationId);

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
                        entities: {
                            select: {
                                id: true,
                                name: true,
                                entityType: true,
                            }
                        },
                        properties: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
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
                const { passwordHash, inviteToken, inviteExpires, entities, properties, ...userWithoutSensitive } = user;
                return {
                    ...userWithoutSensitive,
                    entities: user.entities || [],
                    properties: user.properties || [],
                    isPendingInvite: !!inviteToken, // Use the destructured inviteToken
                };
            });

            console.log('formattedUsers', formattedUsers);

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

        // Update user in transaction - FIXED VERSION
        return await this.prisma.$transaction(async (tx) => {
            console.log('Updating user access for:', userId);
            console.log('New role:', updateAccessDto.role);
            console.log('New status:', updateAccessDto.status);
            console.log('Entity IDs:', updateAccessDto.entityIds);
            console.log('Property IDs:', updateAccessDto.propertyIds);

            // 1. Update basic user info first
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    role: updateAccessDto.role,
                    status: updateAccessDto.status,
                }
            });

            // 2. Update entity relationships using disconnect/connect pattern
            // First disconnect all existing entities
            await tx.user.update({
                where: { id: userId },
                data: {
                    entities: {
                        set: [] // This clears all existing relationships
                    }
                }
            });

            // Then connect new entities if provided
            if (updateAccessDto.entityIds && updateAccessDto.entityIds.length > 0) {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        entities: {
                            connect: updateAccessDto.entityIds.map(id => ({ id }))
                        }
                    }
                });
                console.log('Connected entities:', updateAccessDto.entityIds);
            }

            // 3. Update property relationships using disconnect/connect pattern
            // First disconnect all existing properties
            await tx.user.update({
                where: { id: userId },
                data: {
                    properties: {
                        set: [] // This clears all existing relationships
                    }
                }
            });

            // Then connect new properties if provided
            if (updateAccessDto.propertyIds && updateAccessDto.propertyIds.length > 0) {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        properties: {
                            connect: updateAccessDto.propertyIds.map(id => ({ id }))
                        }
                    }
                });
                console.log('Connected properties:', updateAccessDto.propertyIds);
            }

            // // 4. Create audit log entry
            // try {
            //     await tx.userAccessAudit.create({
            //         data: {
            //             userId: userId,
            //             changedById: currentUserOrgId, // You might want to pass the actual current user ID
            //             changeType: 'ACCESS_UPDATE',
            //             oldRole: userToUpdate.role,
            //             newRole: updateAccessDto.role,
            //             oldStatus: userToUpdate.status,
            //             newStatus: updateAccessDto.status,
            //             entityIds: updateAccessDto.entityIds || [],
            //             propertyIds: updateAccessDto.propertyIds || [],
            //             timestamp: new Date(),
            //         }
            //     });
            // } catch (auditError) {
            //     console.log('Audit log creation failed (non-critical):', auditError.message);
            //     // Don't fail the transaction if audit logging fails
            // }

            // 4. Return updated user with all relationships
            const finalUser = await tx.user.findUnique({
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

            console.log('Final user with relationships:', {
                id: finalUser.id,
                role: finalUser.role,
                status: finalUser.status,
                entities: finalUser.entities,
                properties: finalUser.properties
            });

            return finalUser;
        });
    }

    /**
   * Resend invitation email
   */
    async resendInvitation(invitationId: string, requesterId: string) {
        const invitation = await this.prisma.userInvitation.findUnique({
            where: { id: invitationId },
            include: {
                invitedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        organizationId: true
                    }
                },
                organization: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (invitation.status !== InvitationStatus.PENDING) {
            throw new BadRequestException('Can only resend pending invitations');
        }

        // Verify requester has permission
        const requester = await this.prisma.user.findUnique({
            where: { id: requesterId }
        });

        if (requester?.organizationId !== invitation.organizationId) {
            throw new ForbiddenException('Cannot resend invitations from other organizations');
        }

        // Generate new token and extend expiry
        const newToken = this.generateInviteToken();
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);

        // Update invitation
        await this.prisma.userInvitation.update({
            where: { id: invitationId },
            data: {
                token: newToken,
                expiresAt: newExpiresAt
            }
        });

        // Resend email
        await this.emailService.sendInvitation({
            to: invitation.email,
            firstName: invitation.firstName,
            inviterName: `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`,
            organizationName: invitation.organization.name,
            inviteToken: newToken,
            role: invitation.role
        });

        return { message: 'Invitation resent successfully' };
    }

    /**
   * Get pending invitations for organization
   */
    async getOrganizationInvitations(organizationId: string) {
        return this.prisma.userInvitation.findMany({
            where: {
                organizationId,
                status: InvitationStatus.PENDING,
                expiresAt: { gt: new Date() }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
                expiresAt: true,
                invitedBy: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    // Private helper methods
    private generateInviteToken(): string {
        return randomBytes(32).toString('hex');
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
        inviterRole: UserRole,
        organizationId: string,
        inviterEntityIds: string[]
    ) {
        // For ENTITY_MANAGER, verify they can only assign entities they have access to
        if (inviterRole === UserRole.ENTITY_MANAGER) {
            const unauthorizedEntities = entityIds.filter(id => !inviterEntityIds.includes(id));
            if (unauthorizedEntities.length > 0) {
                throw new ForbiddenException('Cannot assign entities you do not have access to');
            }
        }

        // Verify all entities exist and belong to the organization
        const entities = await this.prisma.entity.findMany({
            where: {
                id: { in: entityIds },
                organizationId
            }
        });

        if (entities.length !== entityIds.length) {
            throw new BadRequestException('One or more entities not found or not accessible');
        }
    }

    private async validatePropertyAccess(
        propertyIds: string[],
        inviterRole: UserRole,
        organizationId: string,
        inviterEntityIds: string[]
    ) {
        // Verify all properties exist and belong to entities in the organization
        const properties = await this.prisma.property.findMany({
            where: {
                id: { in: propertyIds },
                entity: { organizationId }
            },
            include: {
                entity: { select: { id: true } }
            }
        });

        if (properties.length !== propertyIds.length) {
            throw new BadRequestException('One or more properties not found or not accessible');
        }

        // For ENTITY_MANAGER, verify they can only assign properties from entities they have access to
        if (inviterRole === UserRole.ENTITY_MANAGER) {
            const unauthorizedProperties = properties.filter(
                property => !inviterEntityIds.includes(property.entity.id)
            );
            if (unauthorizedProperties.length > 0) {
                throw new ForbiddenException('Cannot assign properties from entities you do not have access to');
            }
        }
    }

    // ALSO ADD this method to verify the relationships are actually saved
    async verifyUserAccess(userId: string) {
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

        console.log('User access verification:', {
            userId: user?.id,
            role: user?.role,
            status: user?.status,
            entitiesCount: user?.entities?.length || 0,
            propertiesCount: user?.properties?.length || 0,
            entities: user?.entities,
            properties: user?.properties
        });

        return user;
    }

    private async validateInvitePermissions(targetRole: UserRole, inviterRole: UserRole) {
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
            ]
        };

        const allowedRoles = roleHierarchy[inviterRole] || [];

        if (!allowedRoles.includes(targetRole)) {
            throw new ForbiddenException('Insufficient permissions to invite users with this role');
        }
    }

    /**
 * Cancel invitation
 */
    async cancelInvitation(invitationId: string, requesterId: string) {
        const invitation = await this.prisma.userInvitation.findUnique({
            where: { id: invitationId },
            include: {
                invitedBy: {
                    select: {
                        organizationId: true
                    }
                }
            }
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (invitation.status !== InvitationStatus.PENDING) {
            throw new BadRequestException('Can only cancel pending invitations');
        }

        // Verify requester has permission
        const requester = await this.prisma.user.findUnique({
            where: { id: requesterId }
        });

        if (requester?.organizationId !== invitation.invitedBy.organizationId) {
            throw new ForbiddenException('Cannot cancel invitations from other organizations');
        }

        // Update invitation status
        await this.prisma.userInvitation.update({
            where: { id: invitationId },
            data: {
                status: InvitationStatus.CANCELLED,
                updatedAt: new Date()
            }
        });

        return { message: 'Invitation cancelled successfully' };
    }

    /**
     * Clean up expired invitations (can be called by a cron job)
     */
    async cleanupExpiredInvitations() {
        const expiredInvitations = await this.prisma.userInvitation.updateMany({
            where: {
                status: InvitationStatus.PENDING,
                expiresAt: { lt: new Date() }
            },
            data: {
                status: InvitationStatus.EXPIRED,
                updatedAt: new Date()
            }
        });

        return {
            message: `Marked ${expiredInvitations.count} invitations as expired`
        };
    }
}