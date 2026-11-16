export const forwardUserContext = (
    {request, context}: {
        request: any;
        context: { user?: any };
    },
) => {
    request.http?.headers.set(
        'user',
        context.user ? JSON.stringify(context.user) : '',
    );
};
