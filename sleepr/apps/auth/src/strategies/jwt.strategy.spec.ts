import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ConfigService} from '@nestjs/config';

import {JwtStrategy} from './jwt.strategy.js';
import {UsersService} from '../users/users.service.js';
import {TokenPayload} from '../interfaces/token-payload.interface.js';
import {Types} from 'mongoose';

describe('JwtStrategy', () => {
    let jwtStrategy: JwtStrategy;

    const configService = {
        getOrThrow: vi.fn().mockReturnValue('test-jwt-secret'),
    };

    const usersService = {
        getUser: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        jwtStrategy = new JwtStrategy(
            configService as unknown as ConfigService,
            usersService as unknown as UsersService,
        );
    });

    describe('validate', () => {
        it('should return the user associated with the JWT payload', async () => {
            const userId = new Types.ObjectId().toString();

            const payload: TokenPayload = {
                userId,
            };

            const user = {
                _id: userId,
                email: 'admin@example.com',
                roles: ['Admin'],
            };

            usersService.getUser.mockResolvedValue(user);

            const result = await jwtStrategy.validate(payload);

            expect(usersService.getUser).toHaveBeenCalledOnce();
            expect(usersService.getUser).toHaveBeenCalledWith({
                _id: userId,
            });
            expect(result).toEqual(user);
        });

        it('should propagate errors when the user does not exist', async () => {
            const userId = new Types.ObjectId().toString();
            const payload: TokenPayload = {
                userId,
            };

            const error = new Error('User not found');

            usersService.getUser.mockRejectedValue(error);

            await expect(jwtStrategy.validate(payload)).rejects.toThrow(error);
        });
    });
});

