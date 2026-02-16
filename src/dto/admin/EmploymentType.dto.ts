import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateEmploymentTypeDto {
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class UpdateEmploymentTypeDto {
    @IsString()
    @IsOptional()
    name?: string;
}
