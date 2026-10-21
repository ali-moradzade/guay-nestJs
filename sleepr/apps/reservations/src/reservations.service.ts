import {Injectable} from '@nestjs/common';
import {CreateReservationDto} from './dto/create-reservation.dto.js';
import {UpdateReservationDto} from './dto/update-reservation.dto.js';
import {ReservationRepository} from './reservation.repository.js';

@Injectable()
export class ReservationsService {
    constructor(
        private readonly repository: ReservationRepository,
    ) {
    }

    create(createReservationDto: CreateReservationDto, userId: string) {
        return this.repository.create({
            ...createReservationDto,
            timestamp: new Date(),
            userId,
        });
    }

    findAll() {
        return this.repository.find({});
    }

    findOne(_id: string) {
        return this.repository.findOne({_id});
    }

    update(_id: string, updateReservationDto: UpdateReservationDto) {
        return this.repository.findOneAndUpdate({_id}, {$set: updateReservationDto});
    }

    remove(_id: string) {
        return this.repository.findOneAndDelete({_id});
    }
}
