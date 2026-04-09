import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsMongoId,
    IsDateString,
    IsNumber,
    IsArray,
    ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

class PanelMemberDto {
    @IsString()
    @IsNotEmpty()
    interviewerType!: string;

    @IsMongoId()
    @IsNotEmpty()
    employeeId!: string;

    @IsString()
    @IsNotEmpty()
    panelRole!: string;
}

export class CreateInterviewDto {
    @IsMongoId()
    @IsNotEmpty()
    candidateId!: string;

    @IsMongoId()
    @IsNotEmpty()
    vacancyId!: string;

    @IsMongoId()
    @IsNotEmpty()
    round!: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    roundNumber?: number;

    @IsString()
    @IsNotEmpty()
    level!: string;

    @IsString()
    @IsNotEmpty()
    type!: string;

    @IsString()
    @IsNotEmpty()
    mode!: string;

    @IsNotEmpty()
    @IsDateString()
    scheduleDate!: string;

    @IsString()
    @IsNotEmpty()
    time!: string;

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    duration!: number;

    @IsString()
    @IsOptional()
    status?: string;

    @IsString()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    phone!: string;

    @IsString()
    @IsNotEmpty()
    timezone!: string;

    @IsString()
    @IsNotEmpty()
    platform!: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsString()
    @IsOptional()
    candidateInstructions?: string;

    @IsString()
    @IsOptional()
    feedback?: string;

    @IsString()
    @IsOptional()
    interviewResult?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PanelMemberDto)
    panelMembers!: PanelMemberDto[];
}

export class UpdateInterviewDto {
    @IsMongoId()
    @IsOptional()
    candidateId?: string;

    @IsMongoId()
    @IsOptional()
    vacancyId?: string;

    @IsMongoId()
    @IsOptional()
    round?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    roundNumber?: number;

    @IsString()
    @IsOptional()
    level?: string;

    @IsString()
    @IsOptional()
    type?: string;

    @IsString()
    @IsOptional()
    mode?: string;

    @IsOptional()
    @IsDateString()
    scheduleDate?: string;

    @IsString()
    @IsOptional()
    time?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    duration?: number;

    @IsString()
    @IsOptional()
    status?: string;

    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    timezone?: string;

    @IsString()
    @IsOptional()
    platform?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsString()
    @IsOptional()
    candidateInstructions?: string;

    @IsString()
    @IsOptional()
    feedback?: string;

    @IsString()
    @IsOptional()
    interviewResult?: string;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => PanelMemberDto)
    panelMembers?: PanelMemberDto[];

    @IsOptional()
    @IsNumber()
    isActive?: number;
}

export class UpdateInterviewStatusDto {
    @IsString()
    @IsNotEmpty()
    status!: string;

    @IsString()
    @IsOptional()
    reason?: string;

    @IsString()
    @IsOptional()
    scheduleDate?: string;

    @IsString()
    @IsOptional()
    time?: string;
}

export class UpdateInterviewFeedbackDto {
    @IsString()
    @IsNotEmpty()
    feedback!: string;

    @IsString()
    @IsNotEmpty()
    interviewResult!: string;
}
