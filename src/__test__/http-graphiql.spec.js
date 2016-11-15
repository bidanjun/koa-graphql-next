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

it('does not renders GraphiQL if no opt-in', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}' }))
        .set('Accept', 'text/html');
    expect(response.res.statusCode).toBe(200);
    expect(response.type).toBe('application/json'); //here,in reaponse,not in response.res.
    expect(response.res.text).toBe('{"data":{"test":"Hello World"}}');
});

it('presents GraphiQL when accepting HTML', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}' }))
        .set('Accept', 'text/html');
    expect(response.res.statusCode).toBe(200);
    expect(response.type).toBe('text/html'); //here,in reaponse,not in response.res.
    expect((response.res.text).indexOf('"{test}') > -1).toBe(true); //include substring
    expect((response.res.text).indexOf('graphiql.min.js') > -1).toBe(true);
});

it('contains a pre-run response within GraphiQL', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}' }))
        .set('Accept', 'text/html');
    expect(response.res.statusCode).toBe(200);
    expect(response.type).toBe('text/html'); //here,in reaponse,not in response.res.
    expect((response.res.text).indexOf('response: ' + JSON.stringify(
        JSON.stringify({ data: { test: 'Hello World' } }, null, 2))) > -1).toBe(true); //include substring
});

it('contains a pre-run operation name within GraphiQL', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({
            query: 'query A{a:test} query B{b:test}',
            operationName: 'B'
        }))
        .set('Accept', 'text/html');
    expect(response.res.statusCode).toBe(200);
    expect(response.type).toBe('text/html'); //here,in reaponse,not in response.res.
    expect((response.res.text).indexOf('response: ' + JSON.stringify(
        JSON.stringify({ data: { b: 'Hello World' } }, null, 2)
    )) > -1).toBe(true); //include substring
});

it('escapes HTML in queries within GraphiQL', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '</script><script>alert(1)</script>' }))
        .set('Accept', 'text/html');
    expect(response.res.statusCode).toBe(400);
    expect(response.type).toBe('text/html'); //here,in reaponse,not in response.res.
    expect((response.res.text).indexOf('</script><script>alert(1)</script>') > -1).toBe(false); //include substring
});

it('escapes HTML in variables within GraphiQL', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({
            query: 'query helloWho($who: String) { test(who: $who) }',
            variables: JSON.stringify({
                who: '</script><script>alert(1)</script>'
            })
        })).set('Accept', 'text/html');
    expect(response.res.statusCode).toBe(200);
    expect(response.type).toBe('text/html'); //here,in reaponse,not in response.res.
    expect((response.res.text).indexOf('</script><script>alert(1)</script>') > -1).toBe(false); //include substring
});

it('GraphiQL renders provided variables', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({
            query: 'query helloWho($who: String) { test(who: $who) }',
            variables: JSON.stringify({ who: 'Dolly' })
        }))
        .set('Accept', 'text/html');
    expect(response.res.statusCode).toBe(200);
    expect(response.type).toBe('text/html'); //here,in reaponse,not in response.res.
    expect((response.res.text).indexOf('variables: ' + JSON.stringify(
        JSON.stringify({ who: 'Dolly' }, null, 2))) > -1).toBe(true); //include substring
});

it('GraphiQL accepts an empty query', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString())
        .set('Accept', 'text/html');
    expect(response.res.statusCode).toBe(200);
    expect(response.type).toBe('text/html'); //here,in reaponse,not in response.res.
    expect((response.res.text).indexOf('response: null') > -1).toBe(true); //include substring
});

it('GraphiQL accepts a mutation query - does not execute it', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({
            query: 'mutation TestMutation { writeTest { test } }'
        }))
        .set('Accept', 'text/html');
    expect(response.res.statusCode).toBe(200);
    expect(response.type).toBe('text/html'); //here,in reaponse,not in response.res.
    expect(
        (response.res.text).indexOf('query: "mutation TestMutation { writeTest { test } }"') > -1
    ).toBe(true);
    expect((response.res.text).indexOf('response: null') > -1).toBe(true); //include substring
});

it('returns HTML if preferred', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}' }))
        .set('Accept', 'text/html,application/json');
    expect(response.res.statusCode).toBe(200);
    expect(response.type).toBe('text/html'); //here,in reaponse,not in response.res.
    expect((response.res.text).indexOf('graphiql.min.js') > -1).toBe(true); //include substring
});

it('returns JSON if preferred', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}' }))
        .set('Accept', 'application/json,text/html');
    expect(response.res.statusCode).toBe(200);
    expect(response.type).toBe('application/json'); //here,in reaponse,not in response.res.
    expect(response.res.text).toBe('{"data":{"test":"Hello World"}}');
});

it('prefers JSON if unknown accept', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}' }))
        .set('Accept', 'unknown');
    expect(response.res.statusCode).toBe(200);
    expect(response.type).toBe('application/json'); //here,in reaponse,not in response.res.
    expect(response.res.text).toBe('{"data":{"test":"Hello World"}}');
});

it('prefers JSON if explicitly requested raw response', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}', raw: '' }))
        .set('Accept', 'text/html');
    expect(response.res.statusCode).toBe(200);
    expect(response.type).toBe('application/json'); //here,in reaponse,not in response.res.
    expect(response.res.text).toBe('{"data":{"test":"Hello World"}}');
});

