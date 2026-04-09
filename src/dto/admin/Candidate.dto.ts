import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsMongoId,
    IsDateString,
    IsEmail,
} from "class-validator";

export class CreateCandidateDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    phone!: string;

    @IsString()
    @IsNotEmpty()
    role!: string;

    @IsMongoId()
    @IsNotEmpty()
    vacancyId!: string;

    @IsMongoId()
    @IsNotEmpty()
    departmentId!: string;

    @IsNotEmpty()
    @IsString()
    experience!: string;

    @IsString()
    @IsNotEmpty()
    noticePeriod!: string;

    @IsString()
    @IsOptional()
    status?: string;

    @IsString()
    @IsNotEmpty()
    source!: string;

    @IsString()
    @IsNotEmpty()
    currentCompany!: string;

    @IsMongoId()
    @IsNotEmpty()
    currentLocation!: string;

    @IsNotEmpty()
    @IsString()
    currentCTC!: string;

    @IsNotEmpty()
    @IsString()
    expectedCTC!: string;

    @IsString()
    @IsOptional()
    skills?: string;

    @IsString()
    @IsOptional()
    remarks?: string;

    @IsString()
    @IsOptional()
    linkedinUrl?: string;

    @IsString()
    @IsOptional()
    portfolioUrl?: string;

    @IsString()
    @IsOptional()
    githubUrl?: string;

    @IsString()
    @IsNotEmpty()
    highestQualification!: string;

    @IsString()
    @IsOptional()
    preferredLocation?: string;

    @IsNotEmpty()
    @IsDateString()
    availableToJoin!: string;

    @IsNotEmpty()
    @IsDateString()
    dob!: string;

    @IsString()
    @IsNotEmpty()
    gender!: string;

    @IsString()
    @IsNotEmpty()
    address!: string;

    @IsOptional()
    resumeFile?: {
        field?: string;
        fileName?: string;
        path?: string;
        originalName?: string;
        url?: string;
    };
}

export class UpdateCandidateDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    role?: string;

    @IsOptional()
    @IsMongoId()
    vacancyId?: string;

    @IsOptional()
    @IsMongoId()
    departmentId?: string;

    @IsOptional()
    @IsString()
    experience?: string;

    @IsOptional()
    @IsString()
    noticePeriod?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    source?: string;

    @IsOptional()
    @IsString()
    currentCompany?: string;

    @IsOptional()
    @IsMongoId()
    currentLocation?: string;

    @IsOptional()
    @IsString()
    currentCTC?: string;

    @IsOptional()
    @IsString()
    expectedCTC?: string;

    @IsOptional()
    @IsString()
    skills?: string;

    @IsOptional()
    @IsString()
    remarks?: string;

    @IsOptional()
    @IsString()
    linkedinUrl?: string;

    @IsOptional()
    @IsString()
    portfolioUrl?: string;

    @IsOptional()
    @IsString()
    githubUrl?: string;

    @IsOptional()
    @IsString()
    highestQualification?: string;

    @IsOptional()
    @IsString()
    preferredLocation?: string;

    @IsOptional()
    @IsDateString()
    availableToJoin?: string;

    @IsOptional()
    @IsDateString()
    dob?: string;

    @IsOptional()
    @IsString()
    gender?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    resumeFile?: {
        field?: string;
        fileName?: string;
        path?: string;
        originalName?: string;
        url?: string;
    };

    @IsOptional()
    isActive?: number;
}
