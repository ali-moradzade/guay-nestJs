import {describe, expect, it} from 'vitest';
import axios from 'axios';
import {ping} from 'tcp-ping';

describe('Health', () => {
    it('Reservations', async () => {
        const res = await axios.get('http://reservations:3000');

        expect(res.status).toBe(200);
    });

    it('Auth', async () => {
        const res = await axios.get('http://auth:3001');

        expect(res.status).toBe(200);
    });

    it('Payments', async () => {
        const result = await new Promise<boolean>((resolve, reject) => {
            ping({
                    address: 'payments',
                    port: 3003,
                },
                (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(true);
                },
            );
        });

        expect(result).toBe(true);
    });

    it('Notifications', async () => {
        const result = await new Promise<boolean>((resolve, reject) => {
            ping({
                    address: 'notifications',
                    port: 3004,
                },
                (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(true);
                },
            );
        });

        expect(result).toBe(true);
    });
});