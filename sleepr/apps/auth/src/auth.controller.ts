import {Controller, HttpCode, Post, Res, UseGuards} from '@nestjs/common';
import {AuthService} from './auth.service.js';
import {LocalAuthGuard} from './guards/local-auth.guard.js';
import {CurrentUser, UserDocument} from '@app/common';
import type {Response} from 'express';
import {MessagePattern, Payload} from '@nestjs/microservices';
import {RpcJwtAuthGuard} from './guards/rpc-jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    @HttpCode(200)
    async login(
        @CurrentUser() user: UserDocument,
        @Res({passthrough: true}) response: Response,
    ) {
        const jwt = await this.authService.login(user, response);
        response.send(jwt);
    }

    @UseGuards(RpcJwtAuthGuard)
    @MessagePattern('authenticate')
    async authenticate(
        @Payload() data: any,
    ) {
        return data.user;
    }
}
