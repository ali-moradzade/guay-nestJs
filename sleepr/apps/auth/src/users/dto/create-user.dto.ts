import {IsArray, IsEmail, IsOptional, IsStrongPassword, ValidateNested} from 'class-validator';
import {RoleDto} from './role.dto.js';
import {Type} from 'class-transformer';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsStrongPassword()
    password: string;

    @IsOptional()
    @IsArray()
    @ValidateNested()
    @Type(() => RoleDto)
    roles?: RoleDto[];
}
