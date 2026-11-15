import {Test, TestingModule} from '@nestjs/testing';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {JwtModule, JwtService} from '@nestjs/jwt';
import {Types} from 'mongoose';
import {Response} from 'express';
import {afterAll, beforeAll, describe, expect, it, vi,} from 'vitest';
import {resolve} from 'node:path';

import {AuthService} from './auth.service.js';
import {TokenPayload} from './interfaces/token-payload.interface.js';
import {UserDocument} from '@app/common';
import Joi from 'joi';

describe('AuthService (integration)', () => {
    let module: TestingModule;
    let authService: AuthService;
    let jwtService: JwtService;
    let configService: ConfigService;
    let expirationSeconds: number;

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
            providers: [AuthService],
        }).compile();

        authService = module.get<AuthService>(AuthService);
        jwtService = module.get<JwtService>(JwtService);
        configService = module.get<ConfigService>(ConfigService);

        expirationSeconds = configService.getOrThrow<number>('JWT_EXPIRATION')
    });

    afterAll(async () => {
        await module?.close();
    });

    const createTestUser = (): UserDocument => {
        return {
            _id: new Types.ObjectId(),
        } as UserDocument;
    };

    const createMockResponse = () => {
        const cookie = vi.fn();

        const response = {
            cookie,
        } as unknown as Response;

        return {response, cookie};
    };

    describe('login', () => {
        it('should return a JWT token', async () => {
            const user = createTestUser();
            const {response} = createMockResponse();

            const token = await authService.login(user, response);

            expect(token).toBeTypeOf('string');
            expect(token.length).toBeGreaterThan(0);
        });

        it('should generate a valid JWT containing the user ID', async () => {
            const user = createTestUser();
            const {response} = createMockResponse();

            const token = await authService.login(user, response);

            const payload = await jwtService.verifyAsync<TokenPayload>(
                token,
            );

            expect(payload.userId).toBe(user._id.toHexString());
        });

        it('should set the Authentication cookie with the generated token', async () => {
            const user = createTestUser();
            const {response, cookie} = createMockResponse();

            const token = await authService.login(user, response);

            expect(cookie).toHaveBeenCalledTimes(1);

            expect(cookie).toHaveBeenCalledWith(
                'Authentication',
                token,
                expect.objectContaining({
                    httpOnly: true,
                    expires: expect.any(Date),
                }),
            );
        });

        it('should set the cookie expiration according to JWT_EXPIRATION', async () => {
            const user = createTestUser();
            const {response, cookie} = createMockResponse();

            const beforeLogin = Date.now();

            await authService.login(user, response);

            const afterLogin = Date.now();

            const cookieOptions = cookie.mock.calls[0][2];

            const expectedExpiration = expirationSeconds * 1000;

            expect(cookieOptions.expires).toBeInstanceOf(Date);

            expect(cookieOptions.expires.getTime()).toBeGreaterThanOrEqual(
                beforeLogin + expectedExpiration,
            );

            expect(cookieOptions.expires.getTime()).toBeLessThanOrEqual(
                afterLogin + expectedExpiration,
            );
        });

        it('should generate different tokens for different users', async () => {
            const firstUser = createTestUser();
            const secondUser = createTestUser();

            const firstResponse = createMockResponse();
            const secondResponse = createMockResponse();

            const firstToken = await authService.login(
                firstUser,
                firstResponse.response,
            );

            const secondToken = await authService.login(
                secondUser,
                secondResponse.response,
            );

            expect(firstToken).not.toBe(secondToken);

            const firstPayload =
                await jwtService.verifyAsync<TokenPayload>(firstToken);

            const secondPayload =
                await jwtService.verifyAsync<TokenPayload>(secondToken);

            expect(firstPayload.userId).toBe(
                firstUser._id.toHexString(),
            );

            expect(secondPayload.userId).toBe(
                secondUser._id.toHexString(),
            );
        });

        it('should set the cookie as HTTP-only', async () => {
            const user = createTestUser();
            const {response, cookie} = createMockResponse();

            await authService.login(user, response);

            const cookieOptions = cookie.mock.calls[0][2];

            expect(cookieOptions.httpOnly).toBe(true);
        });
    });
});

