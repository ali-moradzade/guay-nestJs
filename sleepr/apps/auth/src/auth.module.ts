import {Module} from '@nestjs/common';
import {AuthController} from './auth.controller.js';
import {AuthService} from './auth.service.js';
import {UsersModule} from './users/users.module.js';
import {LoggerModule} from '@app/common';
import {JwtModule} from '@nestjs/jwt';
import {ConfigModule, ConfigService} from '@nestjs/config';
import Joi from 'joi';
import {LocalStrategy} from './strategies/local.strategy.js';
import {JwtStrategy} from './strategies/jwt.strategy.js';

@Module({
    imports: [
        UsersModule,
        LoggerModule,
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                MONGODB_URI: Joi.string().required(),
                JWT_SECRET: Joi.string().required(),
                JWT_EXPIRATION: Joi.string().required(),
                HTTP_PORT: Joi.number().required(),
                TCP_PORT: Joi.number().required(),
            })
        }),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: `${configService.getOrThrow('JWT_EXPIRATION')}s`
                }
            })
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        LocalStrategy,
        JwtStrategy,
    ],
})
export class AuthModule {
}
