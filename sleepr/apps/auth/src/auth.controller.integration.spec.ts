import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {INestApplication, UnauthorizedException} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {JwtModule, JwtService} from '@nestjs/jwt';
import {PassportModule} from '@nestjs/passport';
import {Types} from 'mongoose';
import Joi from 'joi';
import request from 'supertest';
import {resolve} from 'node:path';
import {AuthController} from './auth.controller.js';
import {AuthService} from './auth.service.js';
import {LocalStrategy} from './strategies/local.strategy.js';
import {LocalAuthGuard} from './guards/local-auth.guard.js';
import {UsersService} from './users/users.service.js';
import {UserDocument} from '@app/common';
import {TokenPayload} from './interfaces/token-payload.interface.js';

describe('AuthController (integration)', () => {
    let app: INestApplication;
    let jwtService: JwtService;

    const user = {
        _id: new Types.ObjectId(),
        email: 'test@example.com',
        password: 'hashed-password',
    } as UserDocument;

    const usersServiceMock = {
        verifyUser: vi.fn(),
    };

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            imports: [
                await ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: resolve(process.cwd(), '.env.test'),
                    validationSchema: Joi.object({
                        JWT_SECRET: Joi.string().required(),
                        JWT_EXPIRATION: Joi.number().positive().required(),
                    }),
                }),

                PassportModule.register({
                    defaultStrategy: 'local',
                }),

                JwtModule.registerAsync({
                    inject: [ConfigService],
                    useFactory: (configService: ConfigService) => ({
                        secret: configService.getOrThrow<string>('JWT_SECRET'),
                        signOptions: {
                            expiresIn: `${configService.getOrThrow<number>('JWT_EXPIRATION')}s`,
                        },
                    }),
                }),
            ],
            controllers: [AuthController],
            providers: [
                AuthService,
                LocalStrategy,
                LocalAuthGuard,
                {
                    provide: UsersService,
                    useValue: usersServiceMock,
                },
            ],
        }).compile();

        app = module.createNestApplication();

        jwtService = module.get(JwtService);

        await app.init();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        usersServiceMock.verifyUser.mockResolvedValue(user);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /auth/login', () => {
        it('should authenticate a user and return a JWT', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: user.email,
                    password: 'correct-password',
                })
                .expect(200);

            expect(usersServiceMock.verifyUser).toHaveBeenCalledWith(
                user.email,
                'correct-password',
            );

            const token = response.text;

            expect(token).toBeDefined();

            const payload = jwtService.verify<TokenPayload>(token);

            expect(payload.userId).toBe(user._id.toHexString());
        });

        it('should set an HttpOnly Authentication cookie', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: user.email,
                    password: 'correct-password',
                })
                .expect(200);

            const cookies = response.headers['set-cookie'] as unknown as string[];

            const authenticationCookie = cookies.find(cookie =>
                cookie.startsWith('Authentication='),
            );

            expect(authenticationCookie).toBeDefined();
            expect(authenticationCookie).toMatch(/HttpOnly/i);
        });

        it('should put the same JWT in the response and cookie', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: user.email,
                    password: 'correct-password',
                })
                .expect(200);

            const cookies = response.headers['set-cookie'] as unknown as string[];

            const authenticationCookie = cookies.find(cookie =>
                cookie.startsWith('Authentication='),
            );

            const cookieToken = authenticationCookie
                ?.match(/Authentication=([^;]+)/)?.[1];

            expect(cookieToken).toBe(response.text);
        });

        it('should reject invalid credentials', async () => {
            usersServiceMock.verifyUser.mockRejectedValue(
                new UnauthorizedException('Credentials are not valid'),
            );

            await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: user.email,
                    password: 'wrong-password',
                })
                .expect(401);

            expect(usersServiceMock.verifyUser).toHaveBeenCalledWith(
                user.email,
                'wrong-password',
            );
        });
    });
});
