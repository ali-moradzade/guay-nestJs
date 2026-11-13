import {UnauthorizedException, UnprocessableEntityException,} from '@nestjs/common';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import * as bcrypt from 'bcryptjs';

import {UsersService} from './users.service.js';
import {UsersRepository} from './users.repository.js';
import {CreateUserDto} from './dto/create-user.dto.js';
import {GetUserDto} from './dto/get-user.dto';

describe('UsersService', () => {
    let usersService: UsersService;

    const usersRepository = {
        create: vi.fn(),
        findOne: vi.fn(),
        find: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        usersService = new UsersService(
            usersRepository as unknown as UsersRepository,
        );
    });

    describe('create', () => {
        const createUserDto = {
            email: 'admin@example.com',
            password: 'password123',
        } as CreateUserDto;

        it('should create a user with a hashed password', async () => {
            const createdUser = {
                _id: 'user-id',
                email: createUserDto.email,
                roles: ['Admin'],
            };

            usersRepository.findOne.mockResolvedValue(null);
            usersRepository.create.mockResolvedValue(createdUser);

            const result = await usersService.create(createUserDto);

            expect(usersRepository.findOne).toHaveBeenCalledWith({
                email: createUserDto.email,
            });

            expect(usersRepository.create).toHaveBeenCalledOnce();

            const createArgument = usersRepository.create.mock.calls[0][0];

            expect(createArgument.email).toBe(createUserDto.email);
            expect(createArgument.password).not.toBe(createUserDto.password);

            expect(
                await bcrypt.compare(
                    createUserDto.password,
                    createArgument.password,
                ),
            ).toBe(true);

            expect(result).toEqual(createdUser);
        });

        it('should throw UnprocessableEntityException if email already exists', async () => {
            usersRepository.findOne.mockResolvedValue({
                email: createUserDto.email,
            });

            await expect(usersService.create(createUserDto),)
                .rejects
                .toThrow(
                    UnprocessableEntityException,
                );

            expect(usersRepository.create).not.toHaveBeenCalled();
        });

        it('should propagate repository errors', async () => {
            const databaseError = new Error('Database unavailable');

            usersRepository.findOne.mockRejectedValue(databaseError);

            await expect(
                usersService.create(createUserDto),
            ).rejects.toThrow(databaseError);

            expect(usersRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('verifyUser', () => {
        const email = 'admin@example.com';
        const password = 'password123';

        it('should return the user when credentials are valid', async () => {
            const hashedPassword = await bcrypt.hash(password, 10);

            const user = {
                email,
                password: hashedPassword,
                roles: ['Admin'],
            };

            usersRepository.findOne.mockResolvedValue(user);

            const result = await usersService.verifyUser(
                email,
                password,
            );

            expect(usersRepository.findOne).toHaveBeenCalledWith({
                email,
            });

            expect(result).toEqual(user);
        });

        it('should throw UnauthorizedException when password is incorrect', async () => {
            const hashedPassword = await bcrypt.hash(password, 10);

            usersRepository.findOne.mockResolvedValue({
                email,
                password: hashedPassword,
            });

            await expect(
                usersService.verifyUser(email, 'wrong-password'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException when user does not exist', async () => {
            usersRepository.findOne.mockResolvedValue(null);

            await expect(
                usersService.verifyUser(email, password),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('getUser', () => {
        it('should return the requested user', async () => {
            const getUserDto = {
                _id: 'user-id'
            } as GetUserDto;

            const user = {
                email: 'admin@example.com',
                roles: ['Admin'],
            };

            usersRepository.findOne.mockResolvedValue(user);

            const result = await usersService.getUser(getUserDto);

            expect(usersRepository.findOne).toHaveBeenCalledWith(
                getUserDto,
            );

            expect(result).toEqual(user);
        });
    });

    describe('findAll', () => {
        it('should return all users', async () => {
            const users = [
                {email: 'admin1@example.com', roles: ['Admin']},
                {email: 'admin2@example.com', roles: ['User']},
            ];

            usersRepository.find.mockResolvedValue(users);

            const result = await usersService.findAll();

            expect(usersRepository.find).toHaveBeenCalledWith({});
            expect(result).toEqual(users);
        });
    });
});
