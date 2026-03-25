import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateLocationDto {
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class UpdateLocationDto {
    @IsString()
    @IsOptional()
    name?: string;
}
