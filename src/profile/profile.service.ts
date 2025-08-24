// src/profile/profile.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
    constructor(private prisma: PrismaService) { }

    async getProfile(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                title: true,
                department: true,
                bio: true,
                profilePhotoUrl: true,
                phoneWork: true,
                phoneEmergency: true,
                address: true,
                dateOfBirth: true,
                emergencyContactName: true,
                emergencyContactPhone: true,
                startDate: true,
                role: true,
                status: true,
                createdAt: true,
                lastLoginAt: true,
                organization: {
                    select: { name: true }
                }
            }
        });
    }

    async updateProfile(userId: string, profileData: any) {
        return this.prisma.user.update({
            where: { id: userId },
            data: profileData
        });
    }

    async uploadProfilePhoto(userId: string, file: any) {
        if (!file) {
            throw new Error('No file provided');
        }

        // Simple file handling - save to public uploads folder
        const photoUrl = `/uploads/profiles/${userId}_${Date.now()}.${file.originalname.split('.').pop()}`;

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { profilePhotoUrl: photoUrl }
        });

        return {
            profilePhotoUrl: updatedUser.profilePhotoUrl,
            message: 'Photo uploaded successfully'
        };
    }

    async removeProfilePhoto(userId: string) {
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { profilePhotoUrl: null }
        });

        return {
            profilePhotoUrl: null,
            message: 'Photo removed successfully'
        };
    }
}