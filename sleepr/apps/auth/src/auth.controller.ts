import {Controller, Post, Res, UseGuards} from '@nestjs/common';
import {AuthService} from './auth.service.js';
import {LocalAuthGuard} from './guards/local-auth.guard.js';
import {AuthServiceController, AuthServiceControllerMethods, CurrentUser, UserDocument} from '@app/common';
import type {Response} from 'express';
import {JwtAuthGuard} from './guards/jwt-auth.guard.js';

@Controller('auth')
@AuthServiceControllerMethods()
export class AuthController implements AuthServiceController {
    constructor(private readonly authService: AuthService) {
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(
        @CurrentUser() user: UserDocument,
        @Res({passthrough: true}) response: Response,
    ) {
        const jwt = await this.authService.login(user, response);
        response.send(jwt);
    }

    @UseGuards(JwtAuthGuard)
    async authenticate(
        data: any,
    ) {
        return {
            ...data.user,
            id: data.user._id,
        };
    }
}
