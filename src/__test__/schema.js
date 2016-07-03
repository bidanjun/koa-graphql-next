import { stringify } from 'querystring';
import {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLString,
    GraphQLError,
    BREAK
} from 'graphql';
import graphqlHTTP from '../';

export const QueryRootType = new GraphQLObjectType({
    name: 'QueryRoot',
    fields: {
        test: {
            type: GraphQLString,
            args: {
                who: {
                    type: GraphQLString
                }
            },
            resolve: (root, { who }) => 'Hello ' + (who || 'World')
        },
        thrower: {
            type: new GraphQLNonNull(GraphQLString),
            resolve: () => { throw new Error('Throws!'); }
        },
        context: {
            type: GraphQLString,
            resolve: (obj, args, context) => context,
        }
    }
});

export const TestSchema = new GraphQLSchema({
    query: QueryRootType,
    mutation: new GraphQLObjectType({
        name: 'MutationRoot',
        fields: {
            writeTest: {
                type: QueryRootType,
                resolve: () => ({})
            }
        }
    })
});

export function urlString(urlParams) {
    let string = '/graphql';
    if (urlParams) {
        string += ('?' + stringify(urlParams));
    }
    return string;
}

export function catchError(p) {
    return p.then(
        () => { throw new Error('Expected to catch error.'); },
        error => {
            if (!(error instanceof Error)) {
                throw new Error('Expected to catch error.');
            }
            return error;
        }
    );
}

export function promiseTo(fn) {
    return new Promise((resolve, reject) => {
        fn((error, result) => error ? reject(error) : resolve(result));
    });
}

