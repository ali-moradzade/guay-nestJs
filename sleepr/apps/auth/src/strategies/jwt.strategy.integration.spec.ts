import {Controller, Get, INestApplication, Req, UseGuards,} from '@nestjs/common';
import {Test, TestingModule} from '@nestjs/testing';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {JwtModule, JwtService} from '@nestjs/jwt';
import {PassportModule} from '@nestjs/passport';
import type {Request} from 'express';
import Joi from 'joi';
import request from 'supertest';
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi,} from 'vitest';
import {resolve} from 'node:path';
import {JwtStrategy} from './jwt.strategy.js';
import {JwtAuthGuard} from '../guards/jwt-auth.guard.js';
import {UsersService} from '../users/users.service.js';
import {Types} from 'mongoose';

@Controller('test')
class TestController {
    @Get('protected')
    @UseGuards(JwtAuthGuard)
    getProtectedResource(@Req() req: Request) {
        return {
            user: req.user,
        };
    }
}

describe('JwtStrategy (integration)', () => {
    let module: TestingModule;
    let app: INestApplication;
    let jwtService: JwtService;

    const userId = new Types.ObjectId().toString();

    const authenticatedUser = {
        _id: userId,
        email: 'admin@example.com',
        roles: ['Admin'],
    };

    const usersService = {
        getUser: vi.fn(),
    };

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                await ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: resolve(process.cwd(), '.env.test'),
                    override: true,
                    validationSchema: Joi.object({
                        JWT_SECRET: Joi.string().required(),
                        JWT_EXPIRATION: Joi.number().positive().required(),
                    }),
                }),
                PassportModule.register({
                    defaultStrategy: 'jwt',
                }),
                JwtModule.registerAsync({
                    imports: [ConfigModule],
                    inject: [ConfigService],
                    useFactory: (configService: ConfigService) => ({
                        secret: configService.getOrThrow<string>('JWT_SECRET'),
                        signOptions: {
                            expiresIn: `${configService.getOrThrow<number>(
                                'JWT_EXPIRATION',
                            )}s`,
                        },
                    }),
                }),
            ],
            controllers: [TestController],
            providers: [
                JwtStrategy,
                JwtAuthGuard,
                {
                    provide: UsersService,
                    useValue: usersService,
                },
            ],
        }).compile();

        app = module.createNestApplication();
        await app.init();

        jwtService = module.get<JwtService>(JwtService);
    });

    beforeEach(() => {
        vi.clearAllMocks();
        usersService.getUser.mockResolvedValue(authenticatedUser);
    });

    afterAll(async () => {
        await app?.close();
    });

    describe('JWT authentication', () => {
        it('should authenticate a user with a valid JWT', async () => {
            const token = jwtService.sign({userId});

            await request(app.getHttpServer())
                .get('/test/protected')
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect(({body}) => {
                    expect(body.user).toEqual(authenticatedUser);
                });

            expect(usersService.getUser).toHaveBeenCalledWith({
                _id: userId,
            });
        });

        it('should reject an invalid JWT', async () => {
            await request(app.getHttpServer())
                .get('/test/protected')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(usersService.getUser).not.toHaveBeenCalled();
        });

        it('should reject a request without a JWT', async () => {
            await request(app.getHttpServer())
                .get('/test/protected')
                .expect(401);

            expect(usersService.getUser).not.toHaveBeenCalled();
        });

        it('should reject a JWT signed with a different secret', async () => {
            const token = new JwtService({
                secret: 'different-secret',
            }).sign({userId});

            await request(app.getHttpServer())
                .get('/test/protected')
                .set('Authorization', `Bearer ${token}`)
                .expect(401);

            expect(usersService.getUser).not.toHaveBeenCalled();
        });
    });
});

