// src/tenants/tenants.controller.ts
import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { TenantsService } from "./tenants.service";
import { UserRole } from "@prisma/client";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
    constructor(private tenantsService: TenantsService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Create a new tenant' })
    async createTenant(
        @CurrentUser() currentUser: any,
        @Body() dto: any
    ) {
        return this.tenantsService.createTenant(currentUser.organizationId, dto);
    }

    @Get('organization/:organizationId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    async getTenantsInOrganization(
        @Param('organizationId') organizationId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 50
    ) {
        return this.tenantsService.getTenantsInOrganization(organizationId, Number(page), Number(limit));
    }

    @Get(':tenantId')
    @UseGuards(JwtAuthGuard)
    async getTenantById(@Param('tenantId') tenantId: string) {
        return this.tenantsService.getTenantById(tenantId);
    }

    @Put(':tenantId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    async updateTenant(
        @Param('tenantId') tenantId: string,
        @Body() updates: any
    ) {
        return this.tenantsService.updateTenant(tenantId, updates);
    }

    @Post(':tenantId/enable-portal')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    async enablePortalAccess(@Param('tenantId') tenantId: string) {
        return this.tenantsService.enablePortalAccess(tenantId);
    }

    @Post(':tenantId/disable-portal')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    async disablePortalAccess(@Param('tenantId') tenantId: string) {
        return this.tenantsService.disablePortalAccess(tenantId);
    }

    @Get('search/:organizationId')
    @UseGuards(JwtAuthGuard)
    async searchTenants(
        @Param('organizationId') organizationId: string,
        @Query('q') searchTerm: string,
        @Query('page') page = 1,
        @Query('limit') limit = 50
    ) {
        return this.tenantsService.searchTenants(organizationId, searchTerm, Number(page), Number(limit));
    }
}