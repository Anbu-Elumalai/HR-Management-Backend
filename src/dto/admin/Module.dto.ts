import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    Min,
    Max
} from "class-validator";
import { Type } from "class-transformer";

export class CreateModuleDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    @Type(() => Number)
    isActive?: number = 1;
}

export class UpdateModuleDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    @Type(() => Number)
    isActive?: number;
}
