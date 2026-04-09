import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsBoolean,
    IsArray,
    ValidateNested,
    IsMongoId,
} from "class-validator";
import { Type } from "class-transformer";

export class PermissionActionsDto {
    @IsBoolean()
    view: boolean = false;

    @IsBoolean()
    add: boolean = false;

    @IsBoolean()
    edit: boolean = false;

    @IsBoolean()
    delete: boolean = false;
}

export class RolePermissionDto {
    @IsMongoId()
    @IsNotEmpty()
    moduleId!: string;

    @ValidateNested()
    @Type(() => PermissionActionsDto)
    @IsNotEmpty()
    actions!: PermissionActionsDto;
}

export class CreateRoleDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsBoolean()
    showForAdmin?: boolean = false;

    @IsOptional()
    @IsBoolean()
    mobileAdminAccess?: boolean = false;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RolePermissionDto)
    permissions!: RolePermissionDto[];
}

export class UpdateRoleDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsBoolean()
    showForAdmin?: boolean;

    @IsOptional()
    @IsBoolean()
    mobileAdminAccess?: boolean;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RolePermissionDto)
    permissions?: RolePermissionDto[];
}