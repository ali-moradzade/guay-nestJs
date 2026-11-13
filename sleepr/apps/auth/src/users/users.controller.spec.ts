import {beforeEach, describe, expect, it, vi} from 'vitest';

import {UsersController} from './users.controller.js';
import {UsersService} from './users.service.js';
import {CreateUserDto} from './dto/create-user.dto.js';
// @ts-ignore
import {UserDocument} from '@app/common';

describe('UsersController', () => {
    let usersController: UsersController;

    const usersService = {
        create: vi.fn(),
    };

    beforeEach(() => {
        vi.resetAllMocks();

        usersController = new UsersController(
            usersService as unknown as UsersService,
        );
    });

    describe('createUser', () => {
        it('should create a user', async () => {
            const createUserDto = {
                email: 'user@example.com',
                password: 'password123',
            } as CreateUserDto;

            const createdUser = {
                _id: 'user-id',
                email: createUserDto.email,
                roles: ['User'],
            };

            usersService.create.mockResolvedValue(createdUser);

            const result = await usersController.createUser(createUserDto);

            expect(usersService.create).toHaveBeenCalledOnce();
            expect(usersService.create).toHaveBeenCalledWith(createUserDto);
            expect(result).toEqual(createdUser);
        });

        it('should propagate service errors', async () => {
            const createUserDto = {
                email: 'user@example.com',
                password: 'password123',
            } as CreateUserDto;

            const error = new Error('Something went wrong');

            usersService.create.mockRejectedValue(error);

            await expect(
                usersController.createUser(createUserDto),
            ).rejects.toThrow(error);
        });
    });

    describe('getUser', () => {
        it('should return the authenticated user', async () => {
            const user = {
                _id: 'user-id',
                email: 'user@example.com',
                roles: ['User'],
            } as unknown as UserDocument;

            const result = await usersController.getUser(user);

            expect(result).toEqual(user);
        });
    });
});
