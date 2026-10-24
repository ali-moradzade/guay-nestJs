import {Injectable} from '@nestjs/common';
import {NotifyEmailDto} from './dtos/notify-email.dto.js';
import nodemailer, {Transporter} from 'nodemailer';
import {ConfigService} from '@nestjs/config';

@Injectable()
export class NotificationsService {
    private readonly transporter: Transporter;

    constructor(
        private readonly configService: ConfigService,
    ) {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAUTH2',
                user: this.configService.getOrThrow('SMTP_USER'),
                clientId: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
                clientSecret: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_SECRET'),
                refreshToken: this.configService.getOrThrow('GOOGLE_OAUTH_REFRESH_TOKEN'),
            }
        })
    }

    async notifyEmail({email, text}: NotifyEmailDto) {
        // *************** UNCOMMENT TO USE REAL SERVICE ***************
        // await this.transporter.sendMail({
        //     from: this.configService.getOrThrow('SMTP_USER'),
        //     to: email,
        //     subject: 'Sleeper Notification',
        //     text,
        // })
        console.log(`Email sent to: ${email}\n\n${text}`);
    }
}
