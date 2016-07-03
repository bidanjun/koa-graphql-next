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
import test from 'ava';
import request from 'supertest-as-promised';
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

import {QueryRootType,TestSchema,urlString,promiseTo,catchError} from './schema';

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
    let response = await request(server)
        .get(urlString({
            query: '{test}'
        }));

    t.is(response.res.text, '{"data":{"test":"Hello World"}}');
});

test('allows GET with variable values', async (t) => {
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

    t.is('{"data":{"test":"Hello Dolly"}}', response.res.text);

});

test('allows GET with operation name', async (t) => {
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

    t.deepEqual(JSON.parse(response.res.text), {
        data: {
            test: 'Hello World',
            shared: 'Hello Everyone',
        }
    });
});

test('Reports validation errors', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const server = app.listen();

    const error = await request(server)
        .get(urlString({
            query: '{ test, unknownOne, unknownTwo }'
        }));
    t.is(error.res.statusCode, 400);
    t.deepEqual(JSON.parse(error.res.text), {
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

test('Errors when missing operation name', async (t) => {
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
    t.is(error.res.statusCode, 400);
    t.deepEqual(JSON.parse(error.res.text), {
        errors: [
            { message: 'Must provide operation name if query contains multiple operations.' }
        ]
    });
});

test('Errors when sending a mutation via GET', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const server = app.listen();

    const error = await request(server)
        .get(urlString({
            query: 'mutation TestMutation { writeTest { test } }'
        }))
    t.is(error.res.statusCode, 405);
    t.deepEqual(JSON.parse(error.res.text), {
        errors: [
            { message: 'Can only perform a mutation operation from a POST request.' }
        ]
    });
});

test('Errors when selecting a mutation within a GET', async (t) => {
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
    t.is(error.res.statusCode, 405);
    t.deepEqual(JSON.parse(error.res.text), {
        errors: [
            { message: 'Can only perform a mutation operation from a POST request.' }
        ]
    });
});


test('Allows a mutation to exist within a GET', async (t) => {
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
    t.is(response.res.statusCode, 200);
    t.deepEqual(JSON.parse(response.res.text), {
        data: {
            test: 'Hello World'
        }
    });
});


test('Allows passing in a context', async (t) => {
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
    t.is(response.res.statusCode, 200);
    t.deepEqual(JSON.parse(response.res.text), {
        data: {
            context: 'testValue'
        }
    });
});

test('Allows returning an options Promise', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP(() => Promise.resolve({
        schema: TestSchema,
    })));
    const server = app.listen();

    const response = await request(server)
        .get(urlString({
            query: '{test}'
        }));
    t.is(response.res.statusCode, 200);
    t.is(response.res.text, '{"data":{"test":"Hello World"}}');
});


test('Errors when sending a mutation via GET', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP(() => {
        throw new Error('I did something wrong');
    }));
    const server = app.listen();

    const error = await request(server)
        .get(urlString({
            query: '{test}'
        }));
    t.is(error.res.statusCode, 500);
    t.is(error.res.text, '{"errors":[{"message":"I did something wrong"}]}');
});

