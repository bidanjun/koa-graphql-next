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
import {QueryRootType, TestSchema, urlString, promiseTo} from './schema';

it('allows POST with JSON encoding', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
    }));
    const response = await request(app.listen())
        .post(urlString()).send({ query: '{test}' });
    expect(response.res.statusCode).toBe(200);
    expect(response.res.text).toBe('{"data":{"test":"Hello World"}}');
});

it('Allows sending a mutation via POST', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
    }));
    const response = await request(app.listen())
        .post(urlString())
        .send({ query: 'mutation TestMutation { writeTest { test } }' });
    expect(response.res.statusCode).toBe(200);
    expect(response.res.text).toBe('{"data":{"writeTest":{"test":"Hello World"}}}');
});

it('allows POST with url encoding', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
    }));
    const response = await request(app.listen())
        .post(urlString())
        .send(stringify({ query: '{test}' }));
    expect(response.res.statusCode).toBe(200);
    expect(response.res.text).toBe('{"data":{"test":"Hello World"}}');
});

it('supports POST JSON query with string variables', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
    }));
    const response = await request(app.listen())
        .post(urlString())
        .send({
            query: 'query helloWho($who: String){ test(who: $who) }',
            variables: JSON.stringify({ who: 'Dolly' })
        });

    expect(response.res.statusCode).toBe(200);
    expect(response.res.text).toBe('{"data":{"test":"Hello Dolly"}}');
});

it('supports POST JSON query with JSON variables', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
    }));
    const response = await request(app.listen())
        .post(urlString())
        .send({
            query: 'query helloWho($who: String){ test(who: $who) }',
            variables: { who: 'Dolly' }
        });

    expect(response.res.statusCode).toBe(200);
    expect(response.res.text).toBe('{"data":{"test":"Hello Dolly"}}');
});

it('supports POST url encoded query with string variables', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
    }));
    const response = await request(app.listen())
        .post(urlString())
        .send(stringify({
            query: 'query helloWho($who: String){ test(who: $who) }',
            variables: JSON.stringify({ who: 'Dolly' })
        }));

    expect(response.res.statusCode).toBe(200);
    expect(response.res.text).toBe('{"data":{"test":"Hello Dolly"}}');
});

it('supports POST JSON query with GET variable values', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
    }));
    const response = await request(app.listen())
        .post(urlString({
            variables: JSON.stringify({ who: 'Dolly' })
        }))
        .send({ query: 'query helloWho($who: String){ test(who: $who) }' });

    expect(response.res.statusCode).toBe(200);
    expect(response.res.text).toBe('{"data":{"test":"Hello Dolly"}}');
});

it('supports POST url encoded query with GET variable values', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
    }));
    const response = await request(app.listen())
        .post(urlString({
            variables: JSON.stringify({ who: 'Dolly' })
        }))
        .send(stringify({
            query: 'query helloWho($who: String){ test(who: $who) }'
        }));

    expect(response.res.statusCode).toBe(200);
    expect(response.res.text).toBe('{"data":{"test":"Hello Dolly"}}');
});

it('supports POST raw text query with GET variable values', async () => {
    const app = new koa();
    app.use(graphqlHTTP({
        schema: TestSchema,
    }));
    const response = await request(app.listen())
        .post(urlString({
            variables: JSON.stringify({ who: 'Dolly' })
        }))
        .set('Content-Type', 'application/graphql')
        .send('query helloWho($who: String){ test(who: $who) }');

    expect(response.res.statusCode).toBe(200);
    expect(response.res.text).toBe('{"data":{"test":"Hello Dolly"}}');
});

it('allows POST with operation name', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));
    const response = await request(app.listen())
        .post(urlString())
        .send({
            query: `
              query helloYou { test(who: "You"), ...shared }
              query helloWorld { test(who: "World"), ...shared }
              query helloDolly { test(who: "Dolly"), ...shared }
              fragment shared on QueryRoot {
                shared: test(who: "Everyone")
              }
            `,
            operationName: 'helloWorld'
        });

    expect(response.res.statusCode).toBe(200);
    expect(JSON.parse(response.res.text)).toEqual({
        data: {
            test: 'Hello World',
            shared: 'Hello Everyone',
        }
    });
});

it('allows POST with operation name', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));
    const response = await request(app.listen())
        .post(urlString({
            operationName: 'helloWorld'
        }))
        .set('Content-Type', 'application/graphql')
        .send(`
            query helloYou { test(who: "You"), ...shared }
            query helloWorld { test(who: "World"), ...shared }
            query helloDolly { test(who: "Dolly"), ...shared }
            fragment shared on QueryRoot {
              shared: test(who: "Everyone")
            }
          `);


    expect(response.res.statusCode).toBe(200);
    expect(JSON.parse(response.res.text)).toEqual({
        data: {
            test: 'Hello World',
            shared: 'Hello Everyone',
        }
    });
});

it('allows other UTF charsets', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));
    const req = request(app.listen())
        .post(urlString())
        .set('Content-Type', 'application/graphql; charset=utf-16');
    req.write(new Buffer('{ test(who: "World") }', 'utf16le'));
    const response = await req;


    expect(response.res.statusCode).toBe(200);
    expect(JSON.parse(response.res.text)).toEqual({
        data: {
            test: 'Hello World'
        }
    });
});

it('allows gzipped POST bodies', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));

    const data = { query: '{ test(who: "World") }' };
    const json = JSON.stringify(data);
    const gzippedJson = await promiseTo(cb => zlib.gzip(json, cb));

    const req = request(app.listen())
        .post(urlString())
        .set('Content-Type', 'application/json')
        .set('Content-Encoding', 'gzip');
    req.write(gzippedJson);
    const response = await req;


    expect(response.res.statusCode).toBe(200);
    expect(JSON.parse(response.res.text)).toEqual({
        data: {
            test: 'Hello World'
        }
    });
});

it('allows deflated POST bodies', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => ({
        schema: TestSchema
    })));

    const data = { query: '{ test(who: "World") }' };
    const json = JSON.stringify(data);
    const deflatedJson = await promiseTo(cb => zlib.deflate(json, cb));

    const req = request(app.listen())
        .post(urlString())
        .set('Content-Type', 'application/json')
        .set('Content-Encoding', 'deflate');
    req.write(deflatedJson);
    const response = await req;
    expect(response.res.statusCode).toBe(200);
    expect(JSON.parse(response.res.text)).toEqual({
        data: {
            test: 'Hello World'
        }
    });
});

//note:here,we use koa-multer
//upload files
it('allows for pre-parsed POST bodies', async () => {
    // Note: this is not the only way to handle file uploads with GraphQL,
    // but it is terse and illustrative of using express-graphql and multer
    // together.

    // A simple schema which includes a mutation.
    const UploadedFileType = new GraphQLObjectType({
        name: 'UploadedFile',
        fields: {
            originalname: { type: GraphQLString },
            mimetype: { type: GraphQLString }
        }
    });

    const TestMutationSchema = new GraphQLSchema({
        query: new GraphQLObjectType({
            name: 'QueryRoot',
            fields: {
                test: { type: GraphQLString }
            }
        }),
        mutation: new GraphQLObjectType({
            name: 'MutationRoot',
            fields: {
                uploadFile: {
                    type: UploadedFileType,
                    resolve(rootValue) {
                        // For this test demo, we're just returning the uploaded
                        // file directly, but presumably you might return a Promise
                        // to go store the file somewhere first.
                        return rootValue.request.file;
                    }
                }
            }
        })
    });

    const app = new koa();

    // Multer provides multipart form data parsing.
    const storage = multer.memoryStorage();
    app.use(multer({ storage }).single('file'));

    //note:why should suport provide options by function?
    //here we want use req object to get rootValue
    app.use(graphqlHTTP((ctx) => {
        return {
            schema: TestMutationSchema,
            rootValue: { request: ctx.req }
        };
    }));

    const response = await request(app.listen())
        .post(urlString())
        .field('query', `mutation TestMutation {
            uploadFile { originalname, mimetype }
          }`)
        .attach('file', __filename);


    expect(response.res.statusCode).toBe(200);
    expect(JSON.parse(response.res.text)).toEqual({
        data: {
            uploadFile: {
                originalname: 'http-post.spec.js',
                mimetype: 'application/javascript'
            }
        }
    });
});


it('allows for pre-parsed POST using application/graphql', async () => {
    const app = new koa();
    app.use(async (ctx, next) => {
        if (ctx.is('application/graphql')) {
            ctx.request.body = await bodyParser.text(ctx);
        }
        await next();
    });

    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const req = request(app.listen())
        .post(urlString())
        .set('Content-Type', 'application/graphql');
    req.write(new Buffer('{ test(who: "World") }'));
    const response = await req;
    expect(JSON.parse(response.res.text)).toEqual({
        data: {
            test: 'Hello World'
        }
    });
});

//without content type,should be fail.
it('does not accept unknown pre-parsed POST string', async () => {
    const app = new koa();
    app.use(async (ctx, next) => {
        if (ctx.is('*/*')) {
            ctx.request.body = await bodyParser.text(ctx);
        }
        await next();
    });

    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const req = request(app.listen())
        .post(urlString());

    req.write(new Buffer('{ test(who: "World") }'));
    const error = await req;

    expect(error.res.statusCode).toBe(400);
    expect(JSON.parse(error.res.text)).toEqual({
        errors: [{ message: 'Must provide query string.' }]
    });
});

//without content type,should be fail.
it('does not accept unknown pre-parsed POST raw Buffer', async () => {
    const app = new koa();
    app.use(async (ctx, next) => {
        if (ctx.is('*/*')) {
            const req = ctx.req;
            ctx.request.body = await rawBody(req, {
                length: req.headers['content-length'],
                limit: '1mb',
                encoding: null
            });
        }
        await next();
    });

    app.use(graphqlHTTP({
        schema: TestSchema
    }));
    const req = request(app.listen())
        .post(urlString())
        .set('Content-Type', 'application/graphql');
    req.write(new Buffer('{ test(who: "World") }'));
    const error = await req;

    expect(error.res.statusCode).toBe(400);
    expect(JSON.parse(error.res.text)).toEqual({
        errors: [{ message: 'Must provide query string.' }]
    });
});