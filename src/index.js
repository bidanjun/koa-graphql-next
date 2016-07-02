import {
    Source,
    parse,
    validate,
    execute,
    formatError,
    getOperationAST,
    specifiedRules
} from 'graphql';
import httpError from 'http-errors';
import url from 'url';

export default function graphqlHTTP(options) {
    if (!options) {
        throw new Error('GraphQL middleware requires options.');
    };
    return async (ctx, next) => {
        // Higher scoped variables are referred to at various stages in the
        // asyncronous state machine below.
        let schema;
        let context;
        let rootValue;
        let pretty;
        let graphiql;
        let formatErrorFn;
        let showGraphiQL;
        let query;
        let variables;
        let operationName;
        let validationRules;

        let optionsData;
        let responseData; //the content of response.body
        try {
            // Resolve the Options to get OptionsData.
            const optionsData = await Promise.resolve(
                typeof options === 'function' ? options(ctx.request, ctx.response) : options
            );

            // Assert that optionsData is in fact an Object.
            if (!optionsData || typeof optionsData !== 'object') {
                throw new Error(
                    'GraphQL middleware option function must return an options object ' +
                    'or a promise which will be resolved to an options object.'
                )
            };

            // Assert that schema is required.
            if (!optionsData.schema) {
                throw new Error(
                    'GraphQL middleware options must contain a schema.'
                );
            };

            // Collect information from the options data object.
            schema = optionsData.schema;
            context = optionsData.context;
            rootValue = optionsData.rootValue;
            pretty = optionsData.pretty;
            graphiql = optionsData.graphiql;
            formatErrorFn = optionsData.formatError;

            validationRules = specifiedRules;
            if (optionsData.validationRules) {
                validationRules = validationRules.concat(optionsData.validationRules);
            }

            // GraphQL HTTP only supports GET and POST methods.
            if (request.method !== 'GET' && request.method !== 'POST') {
                response.setHeader('Allow', 'GET, POST');
                throw httpError(405, 'GraphQL only supports GET and POST requests.');
            }

        } catch (error) {
            // If an error was caught, report the httpError status, or 500.
            ctx.response.status = error.status || 500;
            responseData = { errors: [error] };
        }
        // Format any encountered errors.
        if (responseData && responseData.errors) {
            responseData.errors = responseData.errors.map(formatErrorFn || formatError);
        };
        const data = JSON.stringify(responseData, null, pretty ? 2 : 0);
        ctx.response.type = 'application/json';
        ctx.response.body = data;

    }; //end middleware
}; //end graphqlHTTP