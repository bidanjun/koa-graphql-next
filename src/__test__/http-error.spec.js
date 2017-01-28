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

it('handles field errors caught by GraphQL', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const response = await request(app.listen())
        .get(urlString({
            query: '{thrower}',
        }));
    expect(response.res.statusCode).toBe(200);
    expect(JSON.parse(response.res.text)).toEqual({
        data: null,
        errors: [{
            message: 'Throws!',
            locations: [{ line: 1, column: 2 }],
            "path": ["thrower"]}]
    });
});

it('allows for custom error formatting to sanitize', async () => {
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
    expect(response.res.statusCode).toBe(200);
    expect(JSON.parse(response.res.text)).toEqual({
        data: null,
        errors: [{
            message: 'Custom error format: Throws!',
        }]
    });
});

it('allows for custom error formatting to elaborate', async () => {
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
    expect(response.res.statusCode).toBe(200);
    expect(JSON.parse(response.res.text)).toEqual({
        data: null,
        errors: [{
            message: 'Throws!',
            locations: [{ line: 1, column: 2 }],
            stack: 'Stack trace',
        }]
    });
});

it('handles syntax errors caught by GraphQL', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const response = await request(app.listen())
        .get(urlString({
            query: 'syntaxerror',
        }));
    expect(response.res.statusCode).toBe(400);
    expect(JSON.parse(response.res.text)).toEqual({
        errors: [{
            message: 'Syntax Error GraphQL request (1:1) ' +
            'Unexpected Name \"syntaxerror\"\n\n1: syntaxerror\n   ^\n',
            locations: [{ line: 1, column: 1 }]
        }]
    });
});

it('handles errors caused by a lack of query', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const response = await request(app.listen())
        .get(urlString());
    expect(response.res.statusCode).toBe(400);
    expect(JSON.parse(response.res.text)).toEqual({
        errors: [{ message: 'Must provide query string.' }]
    });
});

it('handles invalid JSON bodies', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const response = await request(app.listen())
        .post(urlString())
        .set('Content-Type', 'application/json')
        .send('[]');
    expect(response.res.statusCode).toBe(400);
    expect(JSON.parse(response.res.text)).toEqual({
        errors: [{ message: 'POST body sent invalid JSON.' }]
    });
});

it('handles incomplete JSON bodies', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const response = await request(app.listen())
        .post(urlString())
        .set('Content-Type', 'application/json')
        .send('{"query":');
    expect(response.res.statusCode).toBe(400);
    expect(JSON.parse(response.res.text)).toEqual({
        errors: [{ message: 'POST body sent invalid JSON.' }]
    });
});

it('handles plain POST text', async () => {
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
    expect(response.res.statusCode).toBe(400);
    expect(JSON.parse(response.res.text)).toEqual({
        errors: [{ message: 'Must provide query string.' }]
    });
});

it('handles unsupported charset', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));
    const response = await request(app.listen())
        .post(urlString())
        .set('Content-Type', 'application/graphql; charset=ascii')
        .send('{ test(who: "World") }');
    expect(response.res.statusCode).toBe(415);
    expect(JSON.parse(response.res.text)).toEqual({
        errors: [{ message: 'Unsupported charset "ASCII".' }]
    });
});

it('handles unsupported charset', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));
    const response = await request(app.listen())
        .post(urlString())
        .set('Content-Type', 'application/graphql; charset=utf-53')
        .send('{ test(who: "World") }');
    expect(response.res.statusCode).toBe(415);
    expect(JSON.parse(response.res.text)).toEqual({
        errors: [{ message: 'Unsupported charset "UTF-53".' }]
    });
});

it('handles unknown encoding', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));
    const response = await request(app.listen())
        .post(urlString())
        .set('Content-Encoding', 'garbage')
        .send('!@#$%^*(&^$%#@')
    expect(response.res.statusCode).toBe(415);
    expect(JSON.parse(response.res.text)).toEqual({
        errors: [{ message: 'Unsupported content-encoding "garbage".' }]
    });
});

it('handles poorly formed variables', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));
    const response = await request(app.listen())
        .get(urlString({
            variables: 'who:You',
            query: 'query helloWho($who: String){ test(who: $who) }'
        }))
    expect(response.res.statusCode).toBe(400);
    expect(JSON.parse(response.res.text)).toEqual({
        errors: [{ message: 'Variables are invalid JSON.' }]
    });
});

it('handles unsupported HTTP methods', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));
    const response = await request(app.listen())
        .put(urlString({ query: '{test}' }));
    expect(response.res.statusCode).toBe(405);
    expect(response.res.headers.allow).toBe('GET, POST');
    expect(JSON.parse(response.res.text)).toEqual({
        errors: [
            { message: 'GraphQL only supports GET and POST requests.' }
        ]
    });
}); 
