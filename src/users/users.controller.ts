// src/users/users.controller.ts
import { Controller, Post, Get, Put, Body, Param, Query, UseGuards, Patch, Delete, HttpCode, HttpStatus, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserAccessDto } from './dto/update-user-access.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { CompleteInvitationDto } from './dto/complete-invitation.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Post('setup-organization')
    @ApiOperation({ summary: 'Initial organization setup' })
    async setupOrganization(@Body() dto: any) {
        return this.usersService.setupOrganization(dto);
    }

    /**
       * Send user invitation
       */
    @Post('invite')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Invite a new user to join the organization' })
    @ApiResponse({
        status: 201,
        description: 'Invitation sent successfully'
    })
    @ApiResponse({ status: 400, description: 'Bad request - validation errors' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiBearerAuth('JWT-auth')
    async inviteUser(
        @Body() inviteData: InviteUserDto,
        @CurrentUser() currentUser: any // Get the full user object
    ) {
        console.log('Controller - Current user:', currentUser);
        console.log('Controller - Invite data:', inviteData);

        // Extract user information with validation
        // const inviterId = currentUser?.id || currentUser?.sub;
        const inviterId = currentUser.userId;
        const organizationId = currentUser?.organizationId;
        const inviterRole = currentUser?.role;
        const inviterEntities = currentUser?.entities || [];

        console.log('Controller - Extracted values:', {
            inviterId,
            organizationId,
            inviterRole,
            entitiesCount: inviterEntities.length
        });

        // Validate required fields
        if (!inviterId) {
            throw new BadRequestException('User ID not found in token');
        }

        if (!organizationId) {
            throw new BadRequestException('Organization ID not found in token');
        }

        if (!inviterRole) {
            throw new BadRequestException('User role not found in token');
        }

        const entityIds = inviterEntities.map(e => e.id || e);

        const result = await this.usersService.inviteUser(
            inviteData,
            inviterId,
            organizationId,
            inviterRole,
            entityIds
        );

        return {
            success: true,
            data: result,
            message: 'Invitation sent successfully'
        };
    }

    /**
  * Validate invitation token (public endpoint)
  */
    @Get('validate-invitation/:token')
    @ApiOperation({ summary: 'Validate invitation token' })
    @ApiResponse({
        status: 200,
        description: 'Invitation is valid',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' },
                        organizationName: { type: 'string' },
                        expiresAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    @ApiResponse({ status: 404, description: 'Invitation not found' })
    async validateInvitation(@Param('token') token: string) {
        const result = await this.usersService.validateInvitation(token);

        return {
            success: true,
            data: result
        };
    }

    /**
       * Complete invitation by creating user account (public endpoint)
       */
    @Post('complete-invitation')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Complete invitation and create user account' })
    @ApiResponse({
        status: 201,
        description: 'User account created successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        role: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid token or validation errors' })
    @ApiResponse({ status: 404, description: 'Invitation not found' })
    async completeInvitation(@Body() completeData: CompleteInvitationDto) {
        const result = await this.usersService.completeInvitation(completeData);

        return {
            success: true,
            data: result
        };
    }

    @Get('organization/:organizationId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all users in an organization' })
    @ApiResponse({ status: 200, description: 'Organization users retrieved successfully' })
    async getUsersInOrganization(
        @Param('organizationId') organizationId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 50,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') currentUserOrgId: string,
    ) {
        return this.usersService.getUsersInOrganization(
            organizationId,
            Number(page),
            Number(limit),
            userRole,
            currentUserOrgId
        );
    }

    // @Put(':userId/access')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles(UserRole.ORG_ADMIN)
    // async updateUserAccess(
    //     @Param('userId') userId: string,
    //     @Body() updates: any
    // ) {
    //     return this.usersService.updateUserAccess(userId, updates);
    // }

    /**
       * Resend invitation
       */
    @Post(':id/resend-invitation')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Resend invitation email' })
    @ApiResponse({
        status: 200,
        description: 'Invitation resent successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Invitation resent successfully' }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Invitation not found' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiBearerAuth('JWT-auth')
    async resendInvitation(
        @Param('id') invitationId: string,
        @CurrentUser('userId') requesterId: string  // Changed from 'id' to 'userId'
    ) {
        const result = await this.usersService.resendInvitation(invitationId, requesterId);

        return {
            success: true,
            message: result.message
        };
    }


    @Put(':userId/deactivate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ORG_ADMIN)
    async deactivateUser(@Param('userId') userId: string) {
        return this.usersService.deactivateUser(userId);
    }

    @Get('access-options/:organizationId')
    @UseGuards(JwtAuthGuard)
    async getAccessOptions(@Param('organizationId') organizationId: string) {
        return this.usersService.getAccessOptions(organizationId);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, description: 'User created successfully' })
    async create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
    async findAll(@Query() query: any) {
        return this.usersService.findAll(query);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findOne(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update user' })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete user' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }

    @Patch(':id/access')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update user access and permissions' })
    @ApiResponse({ status: 200, description: 'User access updated successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async updateUserAccess(
        @Param('id') userId: string,
        @Body() updateAccessDto: UpdateUserAccessDto,
        @CurrentUser('role') currentUserRole: UserRole,
        @CurrentUser('organizationId') currentUserOrgId: string,
        @CurrentUser('entities') currentUserEntities: any[],
    ) {
        const result = await this.usersService.updateUserAccess(
            userId,
            updateAccessDto,
            currentUserRole,
            currentUserOrgId,
            currentUserEntities.map(e => e.id)
        );

        return {
            success: true,
            data: result,
            message: 'User access updated successfully'
        };
    }

    @Get(':id/access')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get user access details' })
    @ApiResponse({ status: 200, description: 'User access details retrieved' })
    async getUserAccess(
        @Param('id') userId: string,
        @CurrentUser('role') currentUserRole: UserRole,
        @CurrentUser('organizationId') currentUserOrgId: string,
        @CurrentUser('entities') currentUserEntities: any[],
    ) {
        const result = await this.usersService.getUserAccess(
            userId,
            currentUserRole,
            currentUserOrgId,
            currentUserEntities.map(e => e.id)
        );

        return {
            success: true,
            data: result
        };
    }

    @Get('organization/:organizationId/entities-properties')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get entities and properties for user access management' })
    @ApiResponse({ status: 200, description: 'Entities and properties retrieved' })
    async getEntitiesAndProperties(
        @Param('organizationId') organizationId: string,
        @CurrentUser('role') currentUserRole: UserRole,
        @CurrentUser('organizationId') currentUserOrgId: string,
        @CurrentUser('entities') currentUserEntities: any[],
    ) {
        const result = await this.usersService.getEntitiesAndProperties(
            organizationId,
            currentUserRole,
            currentUserOrgId,
            currentUserEntities.map(e => e.id)
        );

        return {
            success: true,
            data: result
        };
    }

    /**
  * Get organization invitations
  */
    @Get('organization/:organizationId/invitations')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Get pending invitations for organization' })
    @ApiResponse({
        status: 200,
        description: 'Invitations retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            firstName: { type: 'string' },
                            lastName: { type: 'string' },
                            email: { type: 'string' },
                            role: { type: 'string' },
                            status: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' },
                            expiresAt: { type: 'string', format: 'date-time' },
                            invitedBy: {
                                type: 'object',
                                properties: {
                                    firstName: { type: 'string' },
                                    lastName: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    @ApiBearerAuth('JWT-auth')
    async getOrganizationInvitations(
        @Param('organizationId') organizationId: string,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('role') userRole: UserRole
    ) {
        // Verify access to organization
        if (userRole !== UserRole.SUPER_ADMIN && organizationId !== userOrgId) {
            throw new ForbiddenException('Cannot access invitations from other organizations');
        }

        const result = await this.usersService.getOrganizationInvitations(organizationId);

        return {
            success: true,
            data: result
        };
    }

    /**
  * Cancel invitation
  */
    @Post('invitations/:id/cancel')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancel pending invitation' })
    @ApiResponse({
        status: 200,
        description: 'Invitation cancelled successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Invitation cancelled successfully' }
            }
        }
    })
    @ApiBearerAuth('JWT-auth')
    async cancelInvitation(
        @Param('id') invitationId: string,
        @CurrentUser('userId') requesterId: string  // Changed from 'id' to 'userId'
    ) {
        const result = await this.usersService.cancelInvitation(invitationId, requesterId);

        return {
            success: true,
            message: result.message
        };
    }
}