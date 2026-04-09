import { IsString, IsNotEmpty, IsEnum, IsOptional } from "class-validator";


export class CreateMasterDataDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

}

export class UpdateMasterDataDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsOptional()
    isActive?: number;
}
