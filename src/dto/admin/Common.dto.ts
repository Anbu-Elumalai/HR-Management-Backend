import { IsNotEmpty, IsString } from "class-validator";

export class DeleteFileDto {
    @IsString()
    @IsNotEmpty()
    folder!: string;

    @IsString()
    @IsNotEmpty()
    fileName!: string;
}
