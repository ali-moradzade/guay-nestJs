import {Body, Controller, Get, Post, UseGuards} from '@nestjs/common';
import {CreateUserDto} from './dto/create-user.dto.js';
import {UsersService} from './users.service.js';
import {CurrentUser} from '@app/common/decorators/current-user.decorator.js';
import {UserDocument} from './models/user.schema.js';
import {JwtAuthGuard} from '../guards/jwt-auth.guard.js';

@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
    ) {
    }

    @Post()
    async createUser(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getUser(
        @CurrentUser() user: UserDocument,
    ) {
        return user;
    }
}
