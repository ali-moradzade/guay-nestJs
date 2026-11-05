import {Injectable, Logger} from '@nestjs/common';
import {AbstractRepository} from '@app/common';
import {Reservation} from './models/reservation.entity.js';
import {InjectRepository} from '@nestjs/typeorm';
import {EntityManager, Repository} from 'typeorm';

@Injectable()
export class ReservationRepository extends AbstractRepository<Reservation> {
    protected readonly logger = new Logger(ReservationRepository.name);

    constructor(
        @InjectRepository(Reservation) private readonly reservationsRepository: Repository<Reservation>,
        entityManager: EntityManager,
    ) {
        super(reservationsRepository, entityManager);
    }
}
