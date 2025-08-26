import { IsString } from "class-validator";

export class MarkVerifiedDto {
    @IsString()
    isVerified: boolean;

    @IsString()
    verifiedAt: string;

    verificationData?: any;
}