import {Controller, HttpCode, INestApplication, Post, Req, UnauthorizedException, UseGuards,} from '@nestjs/common';
import {Test, TestingModule} from '@nestjs/testing';
import {PassportModule} from '@nestjs/passport';
import type {Request} from 'express';
import request from 'supertest';
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi,} from 'vitest';
import {LocalStrategy} from './local.strategy.js';
import {LocalAuthGuard} from '../guards/local-auth.guard.js';
import {UsersService} from '../users/users.service.js';
import {Types} from 'mongoose';

@Controller('test')
class TestController {
    @Post('protected')
    @HttpCode(200)
    @UseGuards(LocalAuthGuard)
    getProtectedResource(@Req() req: Request) {
        return {
            user: req.user,
        };
    }
}

describe('LocalStrategy (integration)', () => {
    let module: TestingModule;
    let app: INestApplication;

    const authenticatedUser = {
        _id: new Types.ObjectId().toString(),
        email: 'admin@example.com',
        roles: ['Admin'],
    };

    const usersService = {
        verifyUser: vi.fn(),
    };

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                PassportModule.register({
                    defaultStrategy: 'local',
                }),
            ],
            controllers: [TestController],
            providers: [
                LocalStrategy,
                LocalAuthGuard,
                {
                    provide: UsersService,
                    useValue: usersService,
                },
            ],
        }).compile();

        app = module.createNestApplication();
        await app.init();
    });

    beforeEach(() => {
        vi.clearAllMocks();

        usersService.verifyUser.mockResolvedValue(authenticatedUser);
    });

    afterAll(async () => {
        await app?.close();
    });

    describe('Local authentication', () => {
        it('should authenticate a user with valid credentials', async () => {
            await request(app.getHttpServer())
                .post('/test/protected')
                .send({
                    email: 'admin@example.com',
                    password: 'password123',
                })
                .expect(200)
                .expect(({body}) => {
                    expect(body.user).toEqual(authenticatedUser);
                });

            expect(usersService.verifyUser).toHaveBeenCalledOnce();

            expect(usersService.verifyUser).toHaveBeenCalledWith(
                'admin@example.com',
                'password123',
            );
        });

        it('should reject invalid credentials', async () => {
            usersService.verifyUser.mockRejectedValue(
                new UnauthorizedException('Credentials are not valid'),
            );

            await request(app.getHttpServer())
                .post('/test/protected')
                .send({
                    email: 'admin@example.com',
                    password: 'wrong-password',
                })
                .expect(401);

            expect(usersService.verifyUser).toHaveBeenCalledWith(
                'admin@example.com',
                'wrong-password',
            );
        });

        it('should reject a request without an email', async () => {
            await request(app.getHttpServer())
                .post('/test/protected')
                .send({
                    password: 'password123',
                })
                .expect(401);

            expect(usersService.verifyUser).not.toHaveBeenCalled();
        });

        it('should reject a request without a password', async () => {
            await request(app.getHttpServer())
                .post('/test/protected')
                .send({
                    email: 'admin@example.com',
                })
                .expect(401);

            expect(usersService.verifyUser).not.toHaveBeenCalled();
        });

        it('should reject username instead of email', async () => {
            await request(app.getHttpServer())
                .post('/test/protected')
                .send({
                    username: 'admin@example.com',
                    password: 'password123',
                })
                .expect(401);

            expect(usersService.verifyUser).not.toHaveBeenCalled();
        });
    });
});

