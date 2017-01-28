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
import multer from 'koa-multer';
import bodyParser from 'co-body';
import request from 'supertest';
import koa from 'koa';
import rawBody from 'raw-body';

import {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLString,
    GraphQLError,
    BREAK
} from 'graphql';
import graphqlHTTP from '../';

import {QueryRootType, TestSchema, urlString, promiseTo, catchError} from './schema';

it('test harness', async () => {

    let caught;
    try {
        await catchError(Promise.resolve());
    } catch (error) {
        caught = error;
    }
    expect('Expected to catch error.').toBe(caught && caught.message);

    try {
        await catchError(Promise.reject('not a real error'));
    } catch (error) {
        caught = error;
    }
    expect('Expected to catch error.').toBe(caught && caught.message);

    const resolveValue = {};
    const result = await promiseTo(cb => cb(null, resolveValue));
    expect(resolveValue).toBe(result);

    const rejectError = new Error();
    try {
        await promiseTo(cb => cb(rejectError));
    } catch (error) {
        caught = error;
    }
    expect(rejectError).toBe(caught);
});

//start to test GET functionality
it('allows GET with query param', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const server = app.listen();
    let response = await request(server)
        .get(urlString({
            query: '{test}'
        }));

    expect(response.res.text).toBe('{"data":{"test":"Hello World"}}');
});

it('allows GET with variable values', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const server = app.listen();
    let response = await request(server)
        .get(urlString({
            query: 'query helloWho($who: String){ test(who: $who) }',
            variables: JSON.stringify({ who: 'Dolly' })
        }));

    expect('{"data":{"test":"Hello Dolly"}}').toBe(response.res.text);

});

it('allows GET with operation name', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const server = app.listen();
    let response = await request(server)
        .get(urlString({
            query: `
              query helloYou { test(who: "You"), ...shared }
              query helloWorld { test(who: "World"), ...shared }
              query helloDolly { test(who: "Dolly"), ...shared }
              fragment shared on QueryRoot {
                shared: test(who: "Everyone")
              }
            `,
            operationName: 'helloWorld'
        }));

    expect(JSON.parse(response.res.text)).toEqual({
        data: {
            test: 'Hello World',
            shared: 'Hello Everyone',
        }
    });
});

it('Reports validation errors', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const server = app.listen();

    const error = await request(server)
        .get(urlString({
            query: '{ test, unknownOne, unknownTwo }'
        }));
    expect(error.res.statusCode).toBe(400);
    expect(JSON.parse(error.res.text)).toEqual({
        errors: [
            {
                message: 'Cannot query field "unknownOne" on type "QueryRoot".',
                locations: [{ line: 1, column: 9 }]
            },
            {
                message: 'Cannot query field "unknownTwo" on type "QueryRoot".',
                locations: [{ line: 1, column: 21 }]
            }
        ]
    });
});

it('Errors when missing operation name', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const server = app.listen();

    const error = await request(server)
        .get(urlString({
            query: `
                query TestQuery { test }
                mutation TestMutation { writeTest { test } }
              `
        }))
    expect(error.res.statusCode).toBe(400);
    expect(JSON.parse(error.res.text)).toEqual({
        errors: [
            { message: 'Must provide operation name if query contains multiple operations.' }
        ]
    });
});

it('Errors when sending a mutation via GET', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const server = app.listen();

    const error = await request(server)
        .get(urlString({
            query: 'mutation TestMutation { writeTest { test } }'
        }))
    expect(error.res.statusCode).toBe(405);
    expect(JSON.parse(error.res.text)).toEqual({
        errors: [
            { message: 'Can only perform a mutation operation from a POST request.' }
        ]
    });
});

it('Errors when selecting a mutation within a GET', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const server = app.listen();

    const error = await request(server)
        .get(urlString({
            operationName: 'TestMutation',
            query: `
                query TestQuery { test }
                mutation TestMutation { writeTest { test } }
              `
        }));
    expect(error.res.statusCode).toBe(405);
    expect(JSON.parse(error.res.text)).toEqual({
        errors: [
            { message: 'Can only perform a mutation operation from a POST request.' }
        ]
    });
});

it('Allows a mutation to exist within a GET', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const server = app.listen();

    const response = await request(server)
        .get(urlString({
            operationName: 'TestQuery',
            query: `
              mutation TestMutation { writeTest { test } }
              query TestQuery { test }
            `
        }));
    expect(response.res.statusCode).toBe(200);
    expect(JSON.parse(response.res.text)).toEqual({
        data: {
            test: 'Hello World'
        }
    });
});

it('Allows passing in a context', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        context: 'testValue'
    }));
    const server = app.listen();

    const response = await request(server)
        .get(urlString({
            operationName: 'TestQuery',
            query: `
              query TestQuery { context }
            `
        }));
    expect(response.res.statusCode).toBe(200);
    expect(JSON.parse(response.res.text)).toEqual({
        data: {
            context: 'testValue'
        }
    });
});

//v1.04 add test
it('Uses request as context by default', async () => {
    const app = new koa();
    app.use(async (ctx, next) => {
        ctx.foo = 'bar';
        await next(); //为什么await 才行？
    });
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const server = app.listen();

    const response = await request(server)
        .get(urlString({
            operationName: 'TestQuery',
            query: `
              query TestQuery { contextDotFoo }
            `
        }));

   

    expect(response.res.statusCode).toBe(200);
    expect(JSON.parse(response.res.text)).toEqual({
        data: {
            contextDotFoo: 'bar'
        }
    });
});



it('Allows returning an options Promise', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => Promise.resolve({
        schema: TestSchema,
    })));
    const server = app.listen();

    const response = await request(server)
        .get(urlString({
            query: '{test}'
        }));
    expect(response.res.statusCode).toBe(200);
    expect(response.res.text).toBe('{"data":{"test":"Hello World"}}');
});


it('Errors when sending a mutation via GET', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => {
        throw new Error('I did something wrong');
    }));
    const server = app.listen();

    const error = await request(server)
        .get(urlString({
            query: '{test}'
        }));
    expect(error.res.statusCode).toBe(500);
    expect(error.res.text).toBe('{"errors":[{"message":"I did something wrong"}]}');
});