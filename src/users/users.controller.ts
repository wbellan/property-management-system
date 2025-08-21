// src/users/users.controller.ts
import { Controller, Post, Get, Put, Body, Param, Query, UseGuards, Patch, Delete } from '@nestjs/common';
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

    @Post('invite')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Invite a new user' })
    async inviteUser(@CurrentUser() currentUser: any, @Body() dto: any) {
        return this.usersService.inviteUser(currentUser.id, dto);
    }

    @Post('complete-invitation')
    @ApiOperation({ summary: 'Complete user invitation by setting password' })
    async completeInvitation(@Body() body: { inviteToken: string; password: string }) {
        return this.usersService.completeInvitation(body.inviteToken, body.password);
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

    @Post(':userId/resend-invitation')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    async resendInvitation(@Param('userId') userId: string) {
        return this.usersService.resendInvitation(userId);
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
}