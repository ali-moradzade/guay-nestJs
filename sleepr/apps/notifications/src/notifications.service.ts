import {Injectable, OnModuleInit} from '@nestjs/common';
import nodemailer, {Transporter} from 'nodemailer';
import {NotifyEmailDto} from './dtos/notify-email.dto.js';
import {PinoLogger} from 'nestjs-pino';

@Injectable()
export class NotificationsService implements OnModuleInit {
    private transporter!: Transporter;
    private etherealUser!: string;

    constructor(
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(NotificationsService.name);
    }

    async onModuleInit() {
        this.logger.info('Initializing Ethereal transporter');

        try {
            const testAccount = await nodemailer.createTestAccount();
            this.etherealUser = testAccount.user;

            this.transporter = nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });

            await this.transporter.verify();

            this.logger.info('Ethereal transporter initialized successfully');
        } catch (error) {
            this.logger.error(
                {error},
                'Failed to initialize Ethereal transporter',
            );

            throw error;
        }
    }

    async notifyEmail({email, text}: NotifyEmailDto) {
        if (!this.transporter) {
            this.logger.error('Email transporter has not been initialized');
            throw new Error('Email transporter has not been initialized');
        }

        this.logger.info(
            {email},
            'Sending notification email',
        );

        const info = await this.transporter.sendMail({
            from: `"Sleepr Notifications" <${this.etherealUser}>`,
            to: email,
            subject: 'Sleepr Notification',
            text,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);

        this.logger.info(
            {
                email,
                messageId: info.messageId,
                previewUrl,
            },
            'Notification email sent successfully',
        );

        return {
            messageId: info.messageId,
            previewUrl,
        };
    }
}
