import {Injectable, OnModuleInit} from '@nestjs/common';
import nodemailer, {Transporter} from 'nodemailer';
import {NotifyEmailDto} from './dtos/notify-email.dto.js';

@Injectable()
export class NotificationsService implements OnModuleInit {
    private transporter!: Transporter;
    private etherealUser!: string;

    async onModuleInit() {
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
    }

    async notifyEmail({email, text}: NotifyEmailDto) {
        if (!this.transporter) {
            throw new Error('Email transporter has not been initialized');
        }

        const info = await this.transporter.sendMail({
            from: `"Sleepr Notifications" <${this.etherealUser}>`,
            to: email,
            subject: 'Sleepr Notification',
            text,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);

        console.log(`Email sent to: ${email}`);
        console.log(`Preview URL: ${previewUrl}`);

        return {
            messageId: info.messageId,
            previewUrl,
        };
    }
}
