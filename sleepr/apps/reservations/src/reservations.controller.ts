import {Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UsePipes, ValidationPipe} from '@nestjs/common';
import {ReservationsService} from './reservations.service.js';
import {CreateReservationDto} from './dto/create-reservation.dto.js';
import {UpdateReservationDto} from './dto/update-reservation.dto.js';
import {
    PAYMENT_FAILED_EVENT,
    PAYMENT_SUCCEEDED_EVENT,
    PaymentFailedDto,
    PaymentSucceededDto,
} from '@app/common';
import type {UserDto} from '@app/common';
import {CurrentUser, JwtAuthGuard, Roles} from '@app/common';
import {EventPattern, Payload} from '@nestjs/microservices';

@Controller('reservations')
export class ReservationsController {
    constructor(private readonly reservationsService: ReservationsService) {
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(
        @Body() createReservationDto: CreateReservationDto,
        @CurrentUser() user: UserDto,
    ) {
        return this.reservationsService.create(createReservationDto, user);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll() {
        return this.reservationsService.findAll();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    findOne(@Param('id') id: string) {
        return this.reservationsService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updateReservationDto: UpdateReservationDto) {
        return this.reservationsService.update(id, updateReservationDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @Roles('Admin')
    remove(@Param('id') id: string) {
        return this.reservationsService.remove(id);
    }

    @EventPattern(PAYMENT_SUCCEEDED_EVENT)
    @UsePipes(new ValidationPipe())
    async handlePaymentSucceeded(
        @Payload() payload: PaymentSucceededDto,
    ) {
        return this.reservationsService.handlePaymentSucceeded(payload);
    }

    @EventPattern(PAYMENT_FAILED_EVENT)
    @UsePipes(new ValidationPipe())
    async handlePaymentFailed(
        @Payload() payload: PaymentFailedDto,
    ) {
        return this.reservationsService.handlePaymentFailed(payload);
    }
}
