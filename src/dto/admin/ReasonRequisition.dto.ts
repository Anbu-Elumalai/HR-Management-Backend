import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateReasonRequisitionDto {
    @IsString()
    @IsNotEmpty()
    name!: string;
}

export class UpdateReasonRequisitionDto {
    @IsString()
    @IsOptional()
    name?: string;
}
