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

test('does not renders GraphiQL if no opt-in', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}' }))
        .set('Accept', 'text/html');

    t.is(response.res.statusCode, 200);
    t.is(response.type, 'application/json'); //here,in reaponse,not in response.res.
    t.is(response.res.text, '{"data":{"test":"Hello World"}}');
});

test('presents GraphiQL when accepting HTML', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}' }))
        .set('Accept', 'text/html');
    t.is(response.res.statusCode, 200);
    t.is(response.type, 'text/html'); //here,in reaponse,not in response.res.
    t.true((response.res.text).indexOf('"{test}')>-1); //include substring
    t.true((response.res.text).indexOf('graphiql.min.js')>-1);   
});

test('contains a pre-run response within GraphiQL', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
          .get(urlString({ query: '{test}' }))
          .set('Accept', 'text/html');
    t.is(response.res.statusCode, 200);
    t.is(response.type, 'text/html'); //here,in reaponse,not in response.res.
    t.true((response.res.text).indexOf('response: ' + JSON.stringify(
            JSON.stringify({ data: { test: 'Hello World' } }, null, 2)))>-1); //include substring
});

test('contains a pre-run operation name within GraphiQL', async (t) => {
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
    t.is(response.res.statusCode, 200);
    t.is(response.type, 'text/html'); //here,in reaponse,not in response.res.
    t.true((response.res.text).indexOf('response: ' + JSON.stringify(
        JSON.stringify({ data: { b: 'Hello World' } }, null, 2)
    )) > -1); //include substring
});

test('escapes HTML in queries within GraphiQL', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '</script><script>alert(1)</script>' }))
        .set('Accept', 'text/html');
    t.is(response.res.statusCode, 400);
    t.is(response.type, 'text/html'); //here,in reaponse,not in response.res.
    t.false((response.res.text).indexOf('</script><script>alert(1)</script>') > -1); //include substring
});

test('escapes HTML in variables within GraphiQL', async (t) => {
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
    t.is(response.res.statusCode, 200);
    t.is(response.type, 'text/html'); //here,in reaponse,not in response.res.
    t.false((response.res.text).indexOf('</script><script>alert(1)</script>') > -1); //include substring
});

test('GraphiQL renders provided variables', async (t) => {
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
    t.is(response.res.statusCode, 200);
    t.is(response.type, 'text/html'); //here,in reaponse,not in response.res.
    t.true((response.res.text).indexOf('variables: ' + JSON.stringify(
        JSON.stringify({ who: 'Dolly' }, null, 2))) > -1); //include substring
});

test('GraphiQL accepts an empty query', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString())
        .set('Accept', 'text/html');
    t.is(response.res.statusCode, 200);
    t.is(response.type, 'text/html'); //here,in reaponse,not in response.res.
    t.true((response.res.text).indexOf('response: null') > -1); //include substring
});

test('GraphiQL accepts a mutation query - does not execute it', async (t) => {
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
    t.is(response.res.statusCode, 200);
    t.is(response.type, 'text/html'); //here,in reaponse,not in response.res.
    t.true((response.res.text).indexOf('query: "mutation TestMutation { writeTest { test } }"') > -1);
    t.true((response.res.text).indexOf('response: null') > -1); //include substring
});

test('returns HTML if preferred', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}' }))
        .set('Accept', 'text/html,application/json');
    t.is(response.res.statusCode, 200);
    t.is(response.type, 'text/html'); //here,in reaponse,not in response.res.
    t.true((response.res.text).indexOf('graphiql.min.js') > -1); //include substring
});

test('returns JSON if preferred', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}' }))
        .set('Accept', 'application/json,text/html');
    t.is(response.res.statusCode, 200);
    t.is(response.type, 'application/json'); //here,in reaponse,not in response.res.
    t.is(response.res.text, '{"data":{"test":"Hello World"}}');
});

test('prefers JSON if unknown accept', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}' }))
        .set('Accept', 'unknown');
    t.is(response.res.statusCode, 200);
    t.is(response.type, 'application/json'); //here,in reaponse,not in response.res.
    t.is(response.res.text, '{"data":{"test":"Hello World"}}');
});

test('prefers JSON if explicitly requested raw response', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        graphiql: true
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}', raw: '' }))
        .set('Accept', 'text/html');
    t.is(response.res.statusCode, 200);
    t.is(response.type, 'application/json'); //here,in reaponse,not in response.res.
    t.is(response.res.text, '{"data":{"test":"Hello World"}}');
});

