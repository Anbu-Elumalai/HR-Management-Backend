import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsMongoId,
    IsDateString,
    IsNumber,
    IsEnum,
    ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

export enum OfferStatus {
    DRAFT = 'Draft',
    PENDING_APPROVAL = 'Pending Approval',
    OFFER_ISSUED = 'Offer Issued',
    ACCEPTED = 'Accepted',
    REJECTED = 'Rejected',
    EXPIRED = 'Expired',
    CANCELLED = 'Cancelled'
}

class SalaryBreakdownDto {
    @IsNumber()
    @IsNotEmpty()
    basic: number;

    @IsNumber()
    @IsNotEmpty()
    hra: number;

    @IsNumber()
    @IsNotEmpty()
    specialAllowance: number;

    @IsNumber()
    @IsNotEmpty()
    pf: number;

    @IsNumber()
    @IsNotEmpty()
    gratuity: number;

    @IsNumber()
    @IsNotEmpty()
    medicalInsurance: number;
}

export class CreateOfferDto {
    @IsString()
    @IsOptional()
    offerCode?: string;

    @IsMongoId()
    @IsNotEmpty()
    candidateId: string;

    @IsMongoId()
    @IsNotEmpty()
    vacancyId: string;

    @IsMongoId()
    @IsNotEmpty()
    departmentId: string;

    @IsMongoId()
    @IsNotEmpty()
    reportingManager: string;

    @IsMongoId()
    @IsNotEmpty()
    workLocationId: string;

    @IsString()
    @IsNotEmpty()
    workMode: string;

    @IsNotEmpty()
    @IsDateString()
    joiningDate: string;

    @IsNotEmpty()
    @IsDateString()
    offerExpiryDate: string;

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    ctc: number;

    @IsEnum(OfferStatus)
    @IsOptional()
    status?: OfferStatus;

    @IsString()
    @IsOptional()
    candidateResponse?: string;

    @IsString()
    @IsOptional()
    termsAndConditions?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @ValidateNested()
    @Type(() => SalaryBreakdownDto)
    @IsNotEmpty()
    salaryBreakdown: SalaryBreakdownDto;
}

export class UpdateOfferDto {
    @IsString()
    @IsOptional()
    offerCode?: string;

    @IsMongoId()
    @IsOptional()
    candidateId?: string;

    @IsMongoId()
    @IsOptional()
    vacancyId?: string;

    @IsMongoId()
    @IsOptional()
    departmentId?: string;

    @IsMongoId()
    @IsOptional()
    reportingManager?: string;

    @IsMongoId()
    @IsOptional()
    workLocationId?: string;

    @IsString()
    @IsOptional()
    workMode?: string;

    @IsOptional()
    @IsDateString()
    joiningDate?: string;

    @IsOptional()
    @IsDateString()
    offerExpiryDate?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    ctc?: number;

    @IsEnum(OfferStatus)
    @IsOptional()
    status?: OfferStatus;

    @IsString()
    @IsOptional()
    candidateResponse?: string;

    @IsString()
    @IsOptional()
    termsAndConditions?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @ValidateNested()
    @Type(() => SalaryBreakdownDto)
    @IsOptional()
    salaryBreakdown?: SalaryBreakdownDto;

    @IsOptional()
    @IsNumber()
    isActive?: number;
}

export class UpdateOfferStatusDto {
    @IsEnum(OfferStatus)
    @IsNotEmpty()
    status: OfferStatus;

    @IsString()
    @IsOptional()
    reason?: string;
}
