import { createRequire } from 'node:module';
import pinoElastic from 'pino-elasticsearch';

const require = createRequire(import.meta.url);
const pino = require(require.resolve('pino', {
    paths: [require.resolve('nestjs-pino')],
}));


const stream = pinoElastic({
    node: 'http://localhost:9200',
    index: 'sleepr-logs',
    flushBytes: 1,
    flushInterval: 1000,
});

stream.on('insert', () => {
    console.log('Successfully inserted logs into Elasticsearch');
});

stream.on('insertError', (error) => {
    console.error('Elasticsearch insertion error:', error);
});

stream.on('error', (error) => {
    console.error('Transport error:', error);
});

const logger = pino(
    {level: 'info'},
    stream,
);

logger.info({
    service: 'notifications',
    environment: 'development',
    test: true,
}, 'Testing Pino Elasticsearch integration');

