/**
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

// 80+ char lines are useful in describe/it, so ignore in this file.
/* eslint-disable max-len */

import { stringify } from 'querystring';
import url from 'url';
import zlib from 'zlib';
//import multer from 'multer';
//import bodyParser from 'body-parser';
import test from 'ava';
import request from 'supertest-as-promised';
import koa from 'koa';

import {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLString,
    GraphQLError,
    BREAK
} from 'graphql';
import graphqlHTTP from '../';

const QueryRootType = new GraphQLObjectType({
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

const TestSchema = new GraphQLSchema({
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

function urlString(urlParams) {
    let string = '/graphql';
    if (urlParams) {
        string += ('?' + stringify(urlParams));
    }
    return string;
}

function catchError(p) {
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

function promiseTo(fn) {
    return new Promise((resolve, reject) => {
        fn((error, result) => error ? reject(error) : resolve(result));
    });
}

test('test harness', async (t) => {

    let caught;
    try {
        await catchError(Promise.resolve());
    } catch (error) {
        caught = error;
    }
    t.is('Expected to catch error.', caught && caught.message, 'expects to catch errors');

    try {
        await catchError(Promise.reject('not a real error'));
    } catch (error) {
        caught = error;
    }
    t.is('Expected to catch error.', caught && caught.message, 'expects to catch actual errors');

    const resolveValue = {};
    const result = await promiseTo(cb => cb(null, resolveValue));
    t.is(resolveValue, result, 'resolves callback promises');

    const rejectError = new Error();
    try {
        await promiseTo(cb => cb(rejectError));
    } catch (error) {
        caught = error;
    }
    t.is(rejectError, caught, 'rejects callback promises with errors');
});

//start to test GET functionality
test('allows GET with query param', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const server = app.listen();
    let serverRes= await request(server)
        .get(urlString({
            query: '{test}'
        }));

    t.is(serverRes.res.text,'{"data":{"test":"Hello World"}}');
});

    //   it('allows GET with variable values', async () => {
    //     const app = server();

    //     app.use(urlString(), graphqlHTTP({
    //       schema: TestSchema
    //     }));

    //     const response = await request(app)
    //       .get(urlString({
    //         query: 'query helloWho($who: String){ test(who: $who) }',
    //         variables: JSON.stringify({ who: 'Dolly' })
    //       }));

    //     expect(response.text).to.equal(
    //       '{"data":{"test":"Hello Dolly"}}'
    //     );
    //   });

    //   it('allows GET with operation name', async () => {
    //     const app = server();

    //     app.use(urlString(), graphqlHTTP(() => ({
    //       schema: TestSchema
    //     })));

    //     const response = await request(app)
    //       .get(urlString({
    //         query: `
    //           query helloYou { test(who: "You"), ...shared }
    //           query helloWorld { test(who: "World"), ...shared }
    //           query helloDolly { test(who: "Dolly"), ...shared }
    //           fragment shared on QueryRoot {
    //             shared: test(who: "Everyone")
    //           }
    //         `,
    //         operationName: 'helloWorld'
    //       }));

    //     expect(JSON.parse(response.text)).to.deep.equal({
    //       data: {
    //         test: 'Hello World',
    //         shared: 'Hello Everyone',
    //       }
    //     });
    //   });

    //   it('Reports validation errors', async () => {
    //     const app = server();

    //     app.use(urlString(), graphqlHTTP({ schema: TestSchema }));

    //     const error = await catchError(
    //       request(app)
    //         .get(urlString({
    //           query: '{ test, unknownOne, unknownTwo }'
    //         }))
    //     );

    //     expect(error.response.status).to.equal(400);
    //     expect(JSON.parse(error.response.text)).to.deep.equal({
    //       errors: [
    //         {
    //           message: 'Cannot query field "unknownOne" on type "QueryRoot".',
    //           locations: [ { line: 1, column: 9 } ]
    //         },
    //         {
    //           message: 'Cannot query field "unknownTwo" on type "QueryRoot".',
    //           locations: [ { line: 1, column: 21 } ]
    //         }
    //       ]
    //     });
    //   });

    //   it('Errors when missing operation name', async () => {
    //     const app = server();

    //     app.use(urlString(), graphqlHTTP({ schema: TestSchema }));

    //     const error = await catchError(
    //       request(app)
    //         .get(urlString({
    //           query: `
    //             query TestQuery { test }
    //             mutation TestMutation { writeTest { test } }
    //           `
    //         }))
    //     );

    //     expect(error.response.status).to.equal(400);
    //     expect(JSON.parse(error.response.text)).to.deep.equal({
    //       errors: [
    //         { message: 'Must provide operation name if query contains multiple operations.' }
    //       ]
    //     });
    //   });

    //   it('Errors when sending a mutation via GET', async () => {
    //     const app = server();

    //     app.use(urlString(), graphqlHTTP({ schema: TestSchema }));

    //     const error = await catchError(
    //       request(app)
    //         .get(urlString({
    //           query: 'mutation TestMutation { writeTest { test } }'
    //         }))
    //     );

    //     expect(error.response.status).to.equal(405);
    //     expect(JSON.parse(error.response.text)).to.deep.equal({
    //       errors: [
    //         { message: 'Can only perform a mutation operation from a POST request.' }
    //       ]
    //     });
    //   });

    //   it('Errors when selecting a mutation within a GET', async () => {
    //     const app = server();

    //     app.use(urlString(), graphqlHTTP({ schema: TestSchema }));

    //     const error = await catchError(
    //       request(app)
    //         .get(urlString({
    //           operationName: 'TestMutation',
    //           query: `
    //             query TestQuery { test }
    //             mutation TestMutation { writeTest { test } }
    //           `
    //         }))
    //     );

    //     expect(error.response.status).to.equal(405);
    //     expect(JSON.parse(error.response.text)).to.deep.equal({
    //       errors: [
    //         { message: 'Can only perform a mutation operation from a POST request.' }
    //       ]
    //     });
    //   });

    //   it('Allows a mutation to exist within a GET', async () => {
    //     const app = server();

    //     app.use(urlString(), graphqlHTTP({ schema: TestSchema }));

    //     const response = await request(app)
    //       .get(urlString({
    //         operationName: 'TestQuery',
    //         query: `
    //           mutation TestMutation { writeTest { test } }
    //           query TestQuery { test }
    //         `
    //       }));

    //     expect(response.status).to.equal(200);
    //     expect(JSON.parse(response.text)).to.deep.equal({
    //       data: {
    //         test: 'Hello World'
    //       }
    //     });
    //   });

    //   it('Allows passing in a context', async () => {
    //     const app = server();

    //     app.use(urlString(), graphqlHTTP({
    //       schema: TestSchema,
    //       context: 'testValue'
    //     }));

    //     const response = await request(app)
    //       .get(urlString({
    //         operationName: 'TestQuery',
    //         query: `
    //           query TestQuery { context }
    //         `
    //       }));

    //     expect(response.status).to.equal(200);
    //     expect(JSON.parse(response.text)).to.deep.equal({
    //       data: {
    //         context: 'testValue'
    //       }
    //     });
    //   });

    //   it('Allows returning an options Promise', async () => {
    //     const app = server();

    //     app.use(urlString(), graphqlHTTP(() => Promise.resolve({
    //       schema: TestSchema,
    //     })));

    //     const response = await request(app)
    //       .get(urlString({
    //         query: '{test}'
    //       }));

    //     expect(response.text).to.equal(
    //       '{"data":{"test":"Hello World"}}'
    //     );
    //   });

    //   it('Catches errors thrown from options function', async () => {
    //     const app = server();

    //     app.use(urlString(), graphqlHTTP(() => {
    //       throw new Error('I did something wrong');
    //     }));

    //     const req = request(app)
    //       .get(urlString({
    //         query: '{test}'
    //       }));

    //     const error = await catchError(req);

    //     expect(error.response.status).to.equal(500);
    //     expect(error.response.text).to.equal(
    //       '{"errors":[{"message":"I did something wrong"}]}'
    //     );
    //   });
    // });
