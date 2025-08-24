// src/auth/password-validator.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordValidatorService {
    constructor(private prisma: PrismaService) { }

    async validatePassword(password: string, organizationId: string): Promise<{
        isValid: boolean;
        errors: string[];
    }> {
        const policy = await this.prisma.passwordPolicy.findUnique({
            where: { organizationId }
        });

        const errors: string[] = [];

        if (!policy) {
            // Use default policy if none exists
            if (password.length < 8) {
                errors.push('Password must be at least 8 characters long');
            }
        } else {
            // Check length
            if (password.length < policy.minLength) {
                errors.push(`Password must be at least ${policy.minLength} characters long`);
            }

            // Check uppercase requirement
            if (policy.requireUpper && !/[A-Z]/.test(password)) {
                errors.push('Password must contain at least one uppercase letter');
            }

            // Check lowercase requirement
            if (policy.requireLower && !/[a-z]/.test(password)) {
                errors.push('Password must contain at least one lowercase letter');
            }

            // Check number requirement
            if (policy.requireNumbers && !/\d/.test(password)) {
                errors.push('Password must contain at least one number');
            }

            // Check symbol requirement
            if (policy.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
                errors.push('Password must contain at least one special character');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    async checkPasswordHistory(userId: string, newPassword: string, organizationId: string): Promise<boolean> {
        const policy = await this.prisma.passwordPolicy.findUnique({
            where: { organizationId }
        });

        if (!policy || policy.historyCount === 0) {
            return true; // No history check required
        }

        const recentPasswords = await this.prisma.passwordHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: policy.historyCount
        });

        // Check if new password matches any recent password
        for (const oldPassword of recentPasswords) {
            // Use bcrypt to compare the new password against stored hashes
            if (await bcrypt.compare(newPassword, oldPassword.passwordHash)) {
                return false; // Password was used recently
            }
        }

        return true;
    }
}