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
import {QueryRootType, TestSchema, urlString, promiseTo, catchError} from './schema';

test('handles field errors caught by GraphQL', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const response = await request(app.listen())
        .get(urlString({
            query: '{thrower}',
        }));
    t.is(response.res.statusCode, 200);
    t.deepEqual(JSON.parse(response.res.text), {
        data: null,
        errors: [{
            message: 'Throws!',
            locations: [{ line: 1, column: 2 }]
        }]
    });
});

test('allows for custom error formatting to sanitize', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        formatError(error) {
            return { message: 'Custom error format: ' + error.message };
        }
    }));
    const response = await request(app.listen())
        .get(urlString({
            query: '{thrower}',
        }));
    t.is(response.res.statusCode, 200);
    t.deepEqual(JSON.parse(response.res.text), {
        data: null,
        errors: [{
            message: 'Custom error format: Throws!',
        }]
    });
});

test('allows for custom error formatting to elaborate', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        formatError(error) {
            return {
                message: error.message,
                locations: error.locations,
                stack: 'Stack trace'
            };
        }
    }));
    const response = await request(app.listen())
        .get(urlString({
            query: '{thrower}',
        }));
    t.is(response.res.statusCode, 200);
    t.deepEqual(JSON.parse(response.res.text), {
        data: null,
        errors: [{
            message: 'Throws!',
            locations: [{ line: 1, column: 2 }],
            stack: 'Stack trace',
        }]
    });
});

test('handles syntax errors caught by GraphQL', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const response = await request(app.listen())
        .get(urlString({
            query: 'syntaxerror',
        }));
    t.is(response.res.statusCode, 400);
    t.deepEqual(JSON.parse(response.res.text), {
        errors: [{
            message: 'Syntax Error GraphQL request (1:1) ' +
            'Unexpected Name \"syntaxerror\"\n\n1: syntaxerror\n   ^\n',
            locations: [{ line: 1, column: 1 }]
        }]
    });
});

test('handles errors caused by a lack of query', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const response = await request(app.listen())
        .get(urlString());
    t.is(response.res.statusCode, 400);
    t.deepEqual(JSON.parse(response.res.text), {
        errors: [{ message: 'Must provide query string.' }]
    });
});

test('handles invalid JSON bodies', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const response = await request(app.listen())
        .post(urlString())
        .set('Content-Type', 'application/json')
        .send('[]');
    t.is(response.res.statusCode, 400);
    t.deepEqual(JSON.parse(response.res.text), {
        errors: [{ message: 'POST body sent invalid JSON.' }]
    });
});

test('handles incomplete JSON bodies', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const response = await request(app.listen())
        .post(urlString())
        .set('Content-Type', 'application/json')
        .send('{"query":');
    t.is(response.res.statusCode, 400);
    t.deepEqual(JSON.parse(response.res.text), {
        errors: [{ message: 'POST body sent invalid JSON.' }]
    });
});

test('handles plain POST text', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const response = await request(app.listen())
        .post(urlString({
            variables: JSON.stringify({ who: 'Dolly' })
        }))
        .set('Content-Type', 'text/plain')
        .send('query helloWho($who: String){ test(who: $who) }');
    t.is(response.res.statusCode, 400);
    t.deepEqual(JSON.parse(response.res.text), {
        errors: [{ message: 'Must provide query string.' }]
    });
});

test('handles unsupported charset', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));
    const response = await request(app.listen())
        .post(urlString())
        .set('Content-Type', 'application/graphql; charset=ascii')
        .send('{ test(who: "World") }');
    t.is(response.res.statusCode, 415);
    t.deepEqual(JSON.parse(response.res.text), {
        errors: [{ message: 'Unsupported charset "ASCII".' }]
    });
});

test('handles unsupported charset', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));
    const response = await request(app.listen())
        .post(urlString())
        .set('Content-Type', 'application/graphql; charset=utf-53')
        .send('{ test(who: "World") }');
    t.is(response.res.statusCode, 415);
    t.deepEqual(JSON.parse(response.res.text), {
        errors: [{ message: 'Unsupported charset "UTF-53".' }]
    });
});

test('handles unknown encoding', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));
    const response = await request(app.listen())
        .post(urlString())
        .set('Content-Encoding', 'garbage')
        .send('!@#$%^*(&^$%#@')
    t.is(response.res.statusCode, 415);
    t.deepEqual(JSON.parse(response.res.text), {
        errors: [{ message: 'Unsupported content-encoding "garbage".' }]
    });
});

test('handles poorly formed variables', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));
    const response = await request(app.listen())
        .get(urlString({
            variables: 'who:You',
            query: 'query helloWho($who: String){ test(who: $who) }'
        }))
    t.is(response.res.statusCode, 400);
    t.deepEqual(JSON.parse(response.res.text), {
        errors: [{ message: 'Variables are invalid JSON.' }]
    });
});

test('handles unsupported HTTP methods', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));
    const response = await request(app.listen())
        .put(urlString({ query: '{test}' }));
    t.is(response.res.statusCode, 405);
    t.is(response.res.headers.allow, 'GET, POST');
    t.deepEqual(JSON.parse(response.res.text), {
        errors: [
            { message: 'GraphQL only supports GET and POST requests.' }
        ]
    });
}); 
