import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateInterviewRoundDto {
    @IsString()
    @IsNotEmpty()
    name!: string;
}

export class UpdateInterviewRoundDto {
    @IsString()
    @IsOptional()
    name?: string;
}
