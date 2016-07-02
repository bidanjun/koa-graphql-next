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
import { parseBody } from './parseBody';

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

        let urlRoot;
        let optionsData;
        let result; //the content of response.body
        try {
            // Resolve the Options to get OptionsData.
            optionsData = await Promise.resolve(
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


            optionsData.url = optionsData.url || '/graphql';
            urlRoot = optionsData.url;
            //add url
            if (!ctx.url.startsWith(urlRoot)) return next();

            // GraphQL HTTP only supports GET and POST methods.
            if (ctx.request.method !== 'GET' && ctx.request.method !== 'POST') {
                ctx.response.set('Allow', 'GET, POST');
                throw httpError(405, 'GraphQL only supports GET and POST requests.');
            }

            //now parse body;
            let bodyData = await parseBody(ctx);


            result = await new Promise(resolve => {

                const urlData = ctx.request.url && url.parse(ctx.request.url, true).query || {};
                showGraphiQL = graphiql && canDisplayGraphiQL(ctx.request, urlData, bodyData);

                // Get GraphQL params from the request and POST body data.
                const params = getGraphQLParams(urlData, bodyData);
                query = params.query;
                variables = params.variables;
                operationName = params.operationName;

                // If there is no query, but GraphiQL will be displayed, do not produce
                // a result, otherwise return a 400: Bad Request.
                if (!query) {
                    if (showGraphiQL) {
                        resolve(null);
                    }
                    throw httpError(400, 'Must provide query string.');
                }

                // GraphQL source.
                const source = new Source(query, 'GraphQL request');

                // Parse source to AST, reporting any syntax error.
                let documentAST;
                try {
                    documentAST = parse(source);
                } catch (syntaxError) {
                    // Return 400: Bad Request if any syntax errors errors exist.
                    ctx.response.status = 400;
                    resolve({ errors: [syntaxError] });
                }

                // Validate AST, reporting any errors.
                const validationErrors = validate(schema, documentAST, validationRules);
                if (validationErrors.length > 0) {
                    // Return 400: Bad Request if any validation errors exist.
                    ctx.response.status = 400;
                    resolve({ errors: validationErrors });

                }

                // Only query operations are allowed on GET requests.
                if (ctx.request.method === 'GET') {
                    // Determine if this GET request will perform a non-query.
                    const operationAST = getOperationAST(documentAST, operationName);
                    if (operationAST && operationAST.operation !== 'query') {
                        // If GraphiQL can be shown, do not perform this query, but
                        // provide it to GraphiQL so that the requester may perform it
                        // themselves if desired.
                        if (showGraphiQL) {
                            resolve(null);
                        }

                        // Otherwise, report a 405: Method Not Allowed error.
                        ctx.response.set('Allow', 'POST');
                        throw httpError(
                            405,
                            `Can only perform a ${operationAST.operation} operation ` +
                            'from a POST request.'
                        );
                    }
                }
                // Perform the execution, reporting any errors creating the context.
                try {
                    resolve(execute(
                        schema,
                        documentAST,
                        rootValue,
                        context,
                        variables,
                        operationName
                    ));
                } catch (contextError) {
                    // Return 400: Bad Request if any execution context errors exist.
                    ctx.response.status = 400;
                    resolve({ errors: [contextError] });
                };
            }); //end promise
        } catch (error) {
            // If an error was caught, report the httpError status, or 500.
            ctx.response.status = error.status || 500;
            result = { errors: [error] };
        }

        // Format any encountered errors.
        if (result && result.errors) {
            result.errors = result.errors.map(formatErrorFn || formatError);
        }
        // If allowed to show GraphiQL, present it instead of JSON.
        if (showGraphiQL) {
            const data = renderGraphiQL({
                query, variables,
                operationName, result
            });
            ctx.response.type = 'text/html';
            ctx.response.body = data;
        } else {
            // Otherwise, present JSON directly.
            const data = JSON.stringify(result, null, pretty ? 2 : 0);
            ctx.type = 'application/json';
            ctx.response.body = data;
        };

    }; //end middleware
}; //end graphqlHTTP


/**
 * Helper function to get the GraphQL params from the request.
 */
function getGraphQLParams(urlData, bodyData) {
    // GraphQL Query string.
    const query = urlData.query || bodyData.query;

    // Parse the variables if needed.
    let variables = urlData.variables || bodyData.variables;
    if (variables && typeof variables === 'string') {
        try {
            variables = JSON.parse(variables);
        } catch (error) {
            throw httpError(400, 'Variables are invalid JSON.');
        }
    }

    // Name of GraphQL operation to execute.
    const operationName = urlData.operationName || bodyData.operationName;
    return { query, variables, operationName };
}

/**
 * Helper function to determine if GraphiQL can be displayed.
 */
function canDisplayGraphiQL(
    request,
    urlData,
    bodyData
) {
    // If `raw` exists, GraphiQL mode is not enabled.
    const raw = urlData.raw !== undefined || bodyData.raw !== undefined;
    // Allowed to show GraphiQL if not requested as raw and this request
    // prefers HTML over JSON.
    //modify:using request.accepts instead od accepts.
    return !raw && request.accepts(request).types(['json', 'html']) === 'html';
}
