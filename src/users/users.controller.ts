// src/users/users.controller.ts
import { Controller, Post, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

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
    @Roles(UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    async getUsersInOrganization(
        @Param('organizationId') organizationId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 50
    ) {
        return this.usersService.getUsersInOrganization(organizationId, Number(page), Number(limit));
    }

    @Put(':userId/access')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ORG_ADMIN)
    async updateUserAccess(
        @Param('userId') userId: string,
        @Body() updates: any
    ) {
        return this.usersService.updateUserAccess(userId, updates);
    }

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
}