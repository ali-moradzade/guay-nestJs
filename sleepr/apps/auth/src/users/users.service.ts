import {Injectable, UnauthorizedException, UnprocessableEntityException} from '@nestjs/common';
import {CreateUserDto} from './dto/create-user.dto.js';
import * as bcrypt from 'bcryptjs';
import {GetUserDto} from './dto/get-user.dto.js';
import {PrismaService} from '../prisma.service.js';

@Injectable()
export class UsersService {
    constructor(
        private readonly prismaService: PrismaService,
    ) {
    }

    async create(createUserDto: CreateUserDto) {
        await this.validateCreateUserDto(createUserDto);
        return this.prismaService.user.create({
            data: {
                ...createUserDto,
                password: await bcrypt.hash(createUserDto.password, 10)
            }
        });
    }

    async verifyUser(email: string, password: string) {
        const user = await this.prismaService.user.findUniqueOrThrow({where: {email}});
        const passwordIsValid = await bcrypt.compare(password, user.password);

        if (!passwordIsValid) {
            throw new UnauthorizedException('Credentials are not valid');
        }

        return user;
    }

    private async validateCreateUserDto(createUserDto: CreateUserDto) {
        try {
            await this.prismaService.user.findUniqueOrThrow({where: {email: createUserDto.email}});
        } catch (err) {
            return;
        }

        throw new UnprocessableEntityException('Email already exists');
    }

    async getUser(getUserDto: GetUserDto) {
        return this.prismaService.user.findUniqueOrThrow({where: {id: getUserDto.id}});
    }
}
