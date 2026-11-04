import {Controller, HttpCode, HttpStatus, Post, Req, Headers, BadRequestException} from '@nestjs/common';
import {PaymentsService} from './payments.service.js';
import {Request} from 'express';
import type {RawBodyRequest} from '@nestjs/common'
import {Stripe} from 'stripe';

@Controller('webhooks')
export class StripeWebhookController {
    constructor(
        private readonly paymentsService: PaymentsService,
    ) {
    }

    @Post('stripe')
    @HttpCode(HttpStatus.OK)
    handleStripeWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string,
    ) {
        let event: Stripe.Event;
        try {
            event = this.paymentsService.constructEvent(req.rawBody!, signature);
        } catch (error) {
            throw new BadRequestException('Invalid Stripe webhook signature')
        }

        this.paymentsService.handleEvent(event);
        return {
            received: true,
        }
    }
}
