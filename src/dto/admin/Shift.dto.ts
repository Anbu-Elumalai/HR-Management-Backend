import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateShiftDto {
    @IsString()
    @IsNotEmpty()
    name!: string;
}

export class UpdateShiftDto {
    @IsString()
    @IsOptional()
    name?: string;
}
