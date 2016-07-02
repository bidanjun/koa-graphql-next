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

function catchError(p){
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
    t.is('Expected to catch error.',caught && caught.message,'expects to catch errors');

    try {
      await catchError(Promise.reject('not a real error'));
    } catch (error) {
      caught = error;
    }
    t.is('Expected to catch error.',caught && caught.message,'expects to catch actual errors');

    const resolveValue = {};
    const result = await promiseTo(cb => cb(null, resolveValue));
    t.is(resolveValue,result,'resolves callback promises');    

    const rejectError = new Error();
    try {
      await promiseTo(cb => cb(rejectError));
    } catch (error) {
      caught = error;
    }
    t.is(rejectError,caught,'rejects callback promises with errors');
});
