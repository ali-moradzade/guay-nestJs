import {Module} from '@nestjs/common';
import {LoggerModule as PinoLoggerModule} from 'nestjs-pino';
import {ConfigModule, ConfigService} from '@nestjs/config';

@Module({
    imports: [
        PinoLoggerModule.forRootAsync({
            imports: [
                ConfigModule,
            ],
            inject: [
                ConfigService,
            ],
            useFactory: (configService: ConfigService) => ({
                pinoHttp: {
                    level: 'info',
                    base: {
                        service: configService.getOrThrow<string>('SERVICE_NAME'),
                    },
                    transport: {
                        targets: [
                            {
                                target: 'pino-pretty',
                                options: {
                                    singleLine: true
                                }
                            },
                            {
                                target: 'pino-elasticsearch',
                                level: 'info',
                                options: {
                                    node: configService.getOrThrow<string>('ELASTICSEARCH_NODE'),
                                    index: configService.getOrThrow<string>('ELASTICSEARCH_INDEX'),
                                },
                                flushBytes: 1000,
                                flushInterval: 5000,
                            }
                        ]
                    }
                }
            }),
        }),
    ],
    exports: [
        PinoLoggerModule,
    ]
})
export class LoggerModule {
}
