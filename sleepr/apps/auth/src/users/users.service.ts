import {Injectable, UnauthorizedException, UnprocessableEntityException} from '@nestjs/common';
import {CreateUserDto} from './dto/create-user.dto.js';
import {UsersRepository} from './users.repository.js';
import * as bcrypt from 'bcryptjs';
import {GetUserDto} from './dto/get-user.dto.js';
import {Role, User} from '@app/common';

@Injectable()
export class UsersService {
    constructor(
        private readonly usersRepository: UsersRepository,
    ) {
    }

    async create(createUserDto: CreateUserDto) {
        await this.validateCreateUserDto(createUserDto);
        const user = new User({
            ...createUserDto,
            password: await bcrypt.hash(createUserDto.password, 10),
            roles: createUserDto.roles?.map(roleDto => new Role(roleDto))
        })

        return this.usersRepository.create(user);
    }

    async verifyUser(email: string, password: string) {
        const user = await this.usersRepository.findOne({email});
        const passwordIsValid = await bcrypt.compare(password, user.password);

        if (!passwordIsValid) {
            throw new UnauthorizedException('Credentials are not valid');
        }

        return user;
    }

    private async validateCreateUserDto(createUserDto: CreateUserDto) {
        try {
            await this.usersRepository.findOne({email: createUserDto.email})
        } catch (err) {
            return;
        }

        throw new UnprocessableEntityException('Email already exists');
    }

    async getUser(getUserDto: GetUserDto) {
        return this.usersRepository.findOne(getUserDto, {roles: true});
    }
}
