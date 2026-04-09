import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreatePositionDto {
    @IsString()
    @IsNotEmpty()
    name!: string;
}

export class UpdatePositionDto {
    @IsString()
    @IsOptional()
    name?: string;
}
