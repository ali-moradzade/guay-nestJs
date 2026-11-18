import {Injectable} from '@nestjs/common';
import {AbstractRepository, UserDocument} from '@app/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {PinoLogger} from 'nestjs-pino';

@Injectable()
export class UsersRepository extends AbstractRepository<UserDocument> {
    constructor(
        @InjectModel(UserDocument.name) userModel: Model<UserDocument>,
        protected readonly logger: PinoLogger,
    ) {
        super(userModel);
        this.logger.setContext(UsersRepository.name);
    }
}
