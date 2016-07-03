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


const AlwaysInvalidRule = function (context) {
    return {
        enter() {
            context.reportError(new GraphQLError(
                'AlwaysInvalidRule was really invalid!'
            ));
            return BREAK;
        }
    };
};

test('Do not execute a query if it do not pass the custom validation.', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
        validationRules: [AlwaysInvalidRule],
        pretty: true,
    }));
    const response = await request(app.listen())
        .get(urlString({
            query: '{thrower}',
        }))
    t.is(response.res.statusCode, 400);
    t.deepEqual(JSON.parse(response.res.text), {
        errors: [
            {
                message: 'AlwaysInvalidRule was really invalid!'
            },
        ]
    });
});