
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsMongoId,
    IsDateString,
    IsNumber,
    Min,
    IsIn,
    Validate,
    Validator,
    IsBoolean
} from "class-validator";
import { Type, Transform } from "class-transformer";

export class CreateVacancyDto {
    @IsNotEmpty()
    @IsDateString()
    requisitionDate!: string | undefined;

    @IsMongoId()
    @IsNotEmpty()
    departmentId!: string;

    @IsMongoId()
    @IsNotEmpty()
    positionId!: string;

    @IsOptional()
    @IsMongoId()
    reportingToId: string | undefined;


    @IsMongoId()
    @IsNotEmpty()
    employeeTypeId: string | undefined;

    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    gender: string | undefined;

    @IsNumber()
    @Min(1)
    @Type(() => Number)
    numberOfVacancy: number | undefined;

    @IsNotEmpty()
    @IsDateString()
    requiredDate: string | undefined;

    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    preferredEducation: string | undefined;

    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    qualification: string | undefined;

    @IsMongoId()
    @IsNotEmpty()
    reasonForRequisition: string | undefined;

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    salaryRangeFrom: number | undefined;

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    salaryRangeTo: number | undefined;

    // Cross-field validation: salaryRangeFrom <= salaryRangeTo


    @IsOptional()
    file?: {
        fileName?: string;
        path?: string;
        originalName?: string;
    };

    @IsMongoId()
    @IsOptional()
    projectCode: string | undefined;

    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    jobDescription: string | undefined;

    @IsString()
    @IsOptional()
    @IsIn(['draft', 'open', 'closed', 'filled', 'cancelled'])
    status?: string;

    @IsString()
    @IsOptional()
    @IsIn(['pending', 'approved', 'rejected', 'cancelled'])
    approvalStatus?: string;

    // Date validations


    @IsOptional()
    @IsString()
    skills?: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsDateString()
    scheduleDate?: string;

    // New enhanced fields
    @IsOptional()
    @IsMongoId()
    recruiterId?: string;

    @IsOptional()
    @IsIn(['low', 'medium', 'high', 'urgent'])
    priority?: "low" | "medium" | "high" | "urgent";

    @IsOptional()
    @IsNumber()
    @Min(0)
    experienceMin?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    experienceMax?: number;



    @IsOptional()
    @IsIn(['onsite', 'hybrid', 'remote', 'flexible'])
    workLocationType?: "onsite" | "hybrid" | "remote" | "flexible";

    @IsOptional()
    @IsBoolean()
    remoteEligible?: boolean;

    @IsOptional()
    @IsDateString()
    applicationDeadline?: string;

    @IsOptional()
    requiredSkills?: any;

    @IsOptional()
    benefits?: string[];

    @IsOptional()
    @IsString()
    salaryCurrency?: string;

    @IsOptional()
    @IsString()
    externalPostingUrl?: string;
}

export class UpdateVacancyDto {
    @IsOptional()
    @IsDateString()
    requisitionDate?: string;

    @IsOptional()
    @IsMongoId()
    departmentId?: string;

    @IsOptional()
    @IsMongoId()
    positionId?: string;

    @IsOptional()
    @IsMongoId()
    reportingToId?: string;


    @IsOptional()
    @IsMongoId()
    employeeTypeId?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    gender?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    numberOfVacancy?: number;

    @IsOptional()
    @IsDateString()
    requiredDate?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    preferredEducation?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    qualification?: string;

    @IsOptional()
    @IsMongoId()
    reasonForRequisition?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    salaryRangeFrom?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    salaryRangeTo?: number;

    // Cross-field validation for salary (only if both fields present)


    @IsOptional()
    file?: {
        fileName?: string;
        path?: string;
        originalName?: string;
    };

    @IsOptional()
    @IsMongoId()
    projectCode?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    jobDescription?: string;

    @IsString()
    @IsOptional()
    @IsIn(['draft', 'open', 'closed', 'filled', 'cancelled'])
    status?: string;

    @IsString()
    @IsOptional()
    @IsIn(['pending', 'approved', 'rejected', 'cancelled'])
    approvalStatus?: string;

    @IsOptional()
    @IsString()
    skills?: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsDateString()
    scheduleDate?: string;

    @IsOptional()
    @Type(() => Number)
    isActive?: number;

    // Date cross-field validation (only if both dates provided)


    // New enhanced fields
    @IsOptional()
    @IsMongoId()
    recruiterId?: string;

    @IsOptional()
    @IsIn(['low', 'medium', 'high', 'urgent'])
    priority?: "low" | "medium" | "high" | "urgent";

    @IsOptional()
    @IsNumber()
    @Min(0)
    experienceMin?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    experienceMax?: number;



    @IsOptional()
    @IsIn(['onsite', 'hybrid', 'remote', 'flexible'])
    workLocationType?: "onsite" | "hybrid" | "remote" | "flexible";

    @IsOptional()
    @IsBoolean()
    remoteEligible?: boolean;

    @IsOptional()
    @IsDateString()
    applicationDeadline?: string;

    @IsOptional()
    requiredSkills?: any; // Complex object, skipping deep validation for now

    @IsOptional()
    benefits?: string[];

    @IsOptional()
    @IsString()
    salaryCurrency?: string;

    @IsOptional()
    @IsString()
    externalPostingUrl?: string;
}

export class UpdateVacancyStatusDto {
    @IsString()
    @IsNotEmpty()
    @IsIn(['draft', 'open', 'closed', 'filled', 'cancelled'])
    status: string;

    @IsOptional()
    @IsDateString()
    scheduleDate?: string;
}

export class UpdateVacancyApprovalDto {
    @IsString()
    @IsNotEmpty()
    @IsIn(['pending', 'approved', 'rejected', 'cancelled'])
    approvalStatus: string;
    remarks?: string | null;
}
