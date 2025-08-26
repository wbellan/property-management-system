// src/entities/ein-verification.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class EinVerificationService {
    private readonly IRS_API_BASE = 'https://api.irs.gov'; // Example - actual API varies

    async verifyEIN(ein: string): Promise<any> {
        try {
            // ToDo
            // Option 1: Use IRS Business Master File API (if available)
            // Note: The IRS doesn't provide a direct public API for EIN verification
            // You may need to use a third-party service like:

            // Option 2: Use a third-party service (recommended)
            // Examples: TaxBandits, Melissa Data, SmartyStreets, Middesk, etc.

            // For demonstration, here's a mock implementation:
            return await this.mockEinVerification(ein);

            // Real implementation might look like:
            // const response = await axios.get(`${THIRD_PARTY_API}/verify`, {
            //   params: { ein },
            //   headers: { 'Authorization': `Bearer ${API_KEY}` }
            // });

        } catch (error) {
            throw new HttpException(
                'EIN verification failed',
                HttpStatus.BAD_REQUEST
            );
        }
    }

    private async mockEinVerification(ein: string): Promise<any> {
        // Mock implementation for development
        const validEins = [
            '12-3456789',
            '98-7654321',
            '45-6789012'
        ];

        if (validEins.includes(ein)) {
            return {
                isValid: true,
                businessName: 'Sample Business LLC',
                businessAddress: '123 Business St, Business City, TX 78701',
                businessType: 'LLC',
                status: 'Active',
                message: 'EIN verified successfully'
            };
        }

        return {
            isValid: false,
            message: 'EIN not found or invalid'
        };
    }
}