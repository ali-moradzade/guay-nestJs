import {Body, Controller, Get, Post, UseGuards} from '@nestjs/common';
import {CreateUserDto} from './dto/create-user.dto.js';
import {UsersService} from './users.service.js';
import {User, CurrentUser} from '@app/common';
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
        @CurrentUser() user: User,
    ) {
        return user;
    }
}
