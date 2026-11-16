import {forwardUserContext} from './user-context.js';
import {describe, it, beforeEach, expect} from 'vitest';
import {Types} from 'mongoose';

describe('forwardUserContext', () => {
    let request: any;

    beforeEach(() => {
        request = {
            http: {
                headers: {
                    set: vi.fn(),
                },
            },
        };
    });

    it('should forward the authenticated user as a JSON header', () => {
        const user = {
            _id: new Types.ObjectId().toHexString(),
            email: 'test@example.com',
            username: 'test-user',
        };

        forwardUserContext({
            request,
            context: {user},
        });

        expect(request.http.headers.set).toHaveBeenCalledWith(
            'user',
            JSON.stringify(user),
        );
    });

    it('should set an empty user header when context has no user', () => {
        forwardUserContext({
            request,
            context: {},
        });

        expect(request.http.headers.set).toHaveBeenCalledWith(
            'user',
            '',
        );
    });

    it('should set an empty user header when user is undefined', () => {
        forwardUserContext({
            request,
            context: {user: undefined},
        });

        expect(request.http.headers.set).toHaveBeenCalledWith(
            'user',
            '',
        );
    });

    it('should not throw when request.http is undefined', () => {
        request.http = undefined;

        expect(() => {
            forwardUserContext({
                request,
                context: {},
            });
        }).not.toThrow();
    });
});
