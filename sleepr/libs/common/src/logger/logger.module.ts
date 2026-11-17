import {Module} from '@nestjs/common';
import {LoggerModule as PinoLoggerModule} from 'nestjs-pino';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {stdSerializers} from 'pino-http';

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
                    serializers: {
                        req: stdSerializers.req,
                        res: stdSerializers.res,
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
