import { IsString, IsNotEmpty, IsEnum, IsOptional } from "class-validator";


export class CreateDepartmentDto {
    @IsString()
    @IsNotEmpty()
    name: string;

}

export class UpdateDepartmentDto {
    @IsString()
    @IsOptional()
    name?: string;
}
