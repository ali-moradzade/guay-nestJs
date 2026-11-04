import {beforeAll, describe, expect, it} from 'vitest';
import axios from 'axios';

describe('Reservations', () => {
    let jwt: string;

    beforeAll(async () => {
        const user = {
            email: 'sleeprnestapp@gmail.com',
            password: 'StrongPassword123!@',
        };

        try {
            await axios.post('http://auth:3001/users', user);
        } catch (error) {
            // do nothing if user is already registered
        }

        const loginRes = await axios.post('http://auth:3001/auth/login', user);
        jwt = loginRes.data;
    });

    it('Create and Get', async () => {
        const payload = {
            "startDate": "12/20/2022",
            "endDate": "12/25/2022",
            "placeId": "12345",
            "invoiceId": "493",
            "charge": {
                "amount": 5.05,
                "card": {
                    "cvc": "413",
                    "exp_month": 12,
                    "exp_year": 2027,
                    "number": "4242 4242 4242 4242"
                }
            }
        };

        const createdResponse = await axios.post('http://reservations:3000/reservations',
            payload, {
                headers: {
                    Authorization: `Bearer ${jwt}`,
                },
            });

        expect(createdResponse.status).toBe(201);

        const reservation = createdResponse.data;

        const getResponse =
            await axios.get(`http://reservations:3000/reservations/${reservation._id}`, {
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                    },
                }
            );

        expect(getResponse.data).toEqual(reservation);
    });
});
