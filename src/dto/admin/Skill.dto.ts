import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateSkillDto {
    @IsString()
    @IsNotEmpty()
    name!: string;
}

export class UpdateSkillDto {
    @IsString()
    @IsOptional()
    name?: string;
}
