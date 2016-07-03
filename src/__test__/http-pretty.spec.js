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
import {QueryRootType, TestSchema, urlString, promiseTo} from './schema';

test('supports pretty printing', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        pretty: true
    }));
    const response = await request(app.listen())
        .get(urlString({
            query: '{test}'
        }));
    t.is(response.res.text, '{\n' +
        '  "data": {\n' +
        '    "test": "Hello World"\n' +
        '  }\n' +
        '}');
});

test('supports pretty printing configured by request', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP(req => {
        return {
            schema: TestSchema,
            pretty: ((url.parse(req.url, true) || {}).query || {}).pretty === '1'
        };
    }));
    const defaultResponse = await request(app.listen())
        .get(urlString({
            query: '{test}'
        }));
    t.is(defaultResponse.res.text, '{"data":{"test":"Hello World"}}');

    const prettyResponse = await request(app.listen())
        .get(urlString({
            query: '{test}',
            pretty: 1
        }));
    t.is(prettyResponse.res.text, '{\n' +
        '  "data": {\n' +
        '    "test": "Hello World"\n' +
        '  }\n' +
        '}');

    const unprettyResponse = await request(app.listen())
        .get(urlString({
            query: '{test}',
            pretty: 0
        }));
    t.is(unprettyResponse.res.text, '{"data":{"test":"Hello World"}}');
});


test('supports pretty printing', async (t) => {
    const app = new koa();
    let hasRequest = false;
    let hasResponse = false;
    app.use(graphqlHTTP((req, res) => {
        if (req) {
            hasRequest = true;
        }
        if (res) {
            hasResponse = true;
        }
        return { schema: TestSchema };
    }));
    const response = await request(app.listen())
        .get(urlString({ query: '{test}' }));
    t.true(hasRequest);
    t.true(hasResponse);
});

   