
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

    @IsString()
    @IsNotEmpty()
    reportingToName: string;

    @IsString()
    @IsNotEmpty()
    reportingCode: string;

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

    @IsString()
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
    @IsString()
    reportingToName?: string;

    @IsOptional()
    @IsString()
    reportingCode?: string;

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
    @IsString()
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

    @IsOptional()
    @Type(() => Number)
    isActive?: number;
}
