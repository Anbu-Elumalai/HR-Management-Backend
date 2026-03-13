
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsDateString,
    IsEnum
} from "class-validator";
import { Type } from "class-transformer";

export enum ProjectStatus {
    ACTIVE = "Active",
    COMPLETED = "Completed",
    ON_HOLD = "On Hold",
    CANCELLED = "Cancelled"
}

export class CreateProjectDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description: string;

    @IsNotEmpty()
    @IsDateString()
    startDate: string;

    @IsNotEmpty()
    @IsDateString()
    endDate: string;

    @IsEnum(ProjectStatus)
    @IsOptional()
    status: ProjectStatus = ProjectStatus.ACTIVE;

    @IsString()
    @IsNotEmpty()
    manager: string;

    @IsString()
    @IsNotEmpty()
    location: string;
}

export class UpdateProjectDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsEnum(ProjectStatus)
    status?: ProjectStatus;

    @IsOptional()
    @IsString()
    manager?: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @Type(() => Number)
    isActive?: number;
}
