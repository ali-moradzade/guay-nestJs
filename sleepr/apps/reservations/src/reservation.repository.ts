import {Injectable} from '@nestjs/common';
import {AbstractRepository} from '@app/common';
import {ReservationDocument} from './models/reservation.schema.js';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {PinoLogger} from 'nestjs-pino';

@Injectable()
export class ReservationRepository extends AbstractRepository<ReservationDocument> {
    constructor(
        @InjectModel(ReservationDocument.name) reservationModel: Model<ReservationDocument>,
        protected readonly logger: PinoLogger,
    ) {
        super(reservationModel);
        this.logger.setContext(ReservationRepository.name);
    }
}
