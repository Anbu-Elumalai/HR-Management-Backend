
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsMongoId,
    IsDateString,
    IsNumber,
    Min
} from "class-validator";
import { Type } from "class-transformer";

export class CreateVacancyDto {
    @IsNotEmpty()
    @IsDateString()
    requisitionDate: string;

    @IsMongoId()
    @IsNotEmpty()
    departmentId: string;

    @IsMongoId()
    @IsNotEmpty()
    positionId: string;

    @IsOptional()
    // @IsMongoId()
    reportingToId: string;


    @IsMongoId()
    @IsNotEmpty()
    employeeTypeId: string;

    @IsString()
    @IsNotEmpty()
    gender: string;

    @IsNumber()
    @Min(1)
    @Type(() => Number)
    numberOfVacancy: number;

    @IsNotEmpty()
    @IsDateString()
    requiredDate: string;

    @IsString()
    @IsNotEmpty()
    preferredEducation: string;

    @IsString()
    @IsNotEmpty()
    qualification: string;

    @IsMongoId()
    @IsNotEmpty()
    reasonForRequisition: string;

    @IsNumber()
    @Type(() => Number)
    salaryRangeFrom: number;

    @IsNumber()
    @Type(() => Number)
    salaryRangeTo: number;

    @IsOptional()
    file?: {
        fileName?: string;
        path?: string;
        originalName?: string;
    };

    @IsMongoId()
    @IsOptional()
    projectCode: string;

    @IsString()
    @IsNotEmpty()
    jobDescription: string;

    @IsString()
    @IsOptional()
    status?: string;

    @IsString()
    @IsOptional()
    approvalStatus?: string;

    @IsOptional()
    @IsDateString()
    scheduleDate?: string;
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
    preferredEducation?: string;

    @IsOptional()
    @IsString()
    qualification?: string;

    @IsOptional()
    @IsMongoId()
    reasonForRequisition?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    salaryRangeFrom?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    salaryRangeTo?: number;

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
    jobDescription?: string;

    @IsString()
    @IsOptional()
    status?: string;

    @IsString()
    @IsOptional()
    approvalStatus?: string;

    @IsOptional()
    @IsDateString()
    scheduleDate?: string;

    @IsOptional()
    @Type(() => Number)
    isActive?: number;
}
