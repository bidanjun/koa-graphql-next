/**
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import contentType from 'content-type';
import getBody from 'raw-body';
import httpError from 'http-errors';
import querystring from 'querystring';
import zlib from 'zlib';

export function parseBody(ctx) {
    return new Promise((resolve, reject) => {

        //here,when we use other body parser at first,we should work normally
        //express body parse test ok,but in koa,koa-bodyparse couldn't work,it can't parse text.
        //we could use co-body test it.
        // If koa has already parsed a body as a keyed object, use it.
        if (typeof ctx.req.body === 'object' && !(ctx.req.body instanceof Buffer)) {
            return resolve(ctx.req.body);
        }

        if (typeof ctx.request.body === 'object' && !(ctx.request.body instanceof Buffer)) {
            return resolve(ctx.request.body);
        }

        // Skip requests without content types.
        if (ctx.req.headers['content-type'] === undefined) {
            return resolve({});
        }

        const typeInfo = contentType.parse(ctx.req);

        // If koa has already parsed a body as a string, and the content-type
        // was application/graphql, parse the string body.
        if (typeof ctx.request.body === 'string' &&
            typeInfo.type === 'application/graphql') {
            return resolve(graphqlParser(ctx.request.body));
        }

        // Already parsed body we didn't recognise? Parse nothing.
        if (ctx.request.body) {
            return resolve({});
        }

        // Use the correct body parser based on Content-Type header.
        switch (typeInfo.type) {
            case 'application/graphql':
                return read(ctx.req, typeInfo, graphqlParser, resolve, reject);
            case 'application/json':
                return read(ctx.req, typeInfo, jsonEncodedParser, resolve, reject);
            case 'application/x-www-form-urlencoded':
                return read(ctx.req, typeInfo, urlEncodedParser, resolve, reject);
        }

        // If no Content-Type header matches, parse nothing.
        return resolve({});
    });
}

function jsonEncodedParser(body) {
    if (jsonObjRegex.test(body)) {
        /* eslint-disable no-empty */
        try {
            return JSON.parse(body);
        } catch (error) {
            // Do nothing
        }
        /* eslint-enable no-empty */
    }
    throw httpError(400, 'POST body sent invalid JSON.');
}

function urlEncodedParser(body) {
    return querystring.parse(body);
}

function graphqlParser(body) {
    return { query: body };
}

/**
 * RegExp to match an Object-opening brace "{" as the first non-space
 * in a string. Allowed whitespace is defined in RFC 7159:
 *
 *     x20  Space
 *     x09  Horizontal tab
 *     x0A  Line feed or New line
 *     x0D  Carriage return
 */
const jsonObjRegex = /^[\x20\x09\x0a\x0d]*\{/;

// Read and parse a request body.
function read(req, typeInfo, parseFn, resolve, reject) {
    const charset = (typeInfo.parameters.charset || 'utf-8').toLowerCase();

    // Assert charset encoding per JSON RFC 7159 sec 8.1
    if (charset.slice(0, 4) !== 'utf-') {
        throw httpError(415, `Unsupported charset "${charset.toUpperCase()}".`);
    }

    // Get content-encoding (e.g. gzip)
    const encoding =
        (req.headers['content-encoding'] || 'identity').toLowerCase();
    const length = encoding === 'identity' ? req.headers['content-length'] : null;
    const limit = 100 * 1024; // 100kb
    const stream = decompressed(req, encoding);

    // Read body from stream.
    getBody(stream, { encoding: charset, length, limit }, function (err, body) {
        if (err) {
            return reject(
                err.type === 'encoding.unsupported' ?
                    httpError(415, `Unsupported charset "${charset.toUpperCase()}".`) :
                    httpError(400, `Invalid body: ${err.message}.`)
            );
        }

        try {
            // Decode and parse body.
            return resolve(parseFn(body));
        } catch (error) {
            return reject(error);
        }
    });
}

// Return a decompressed stream, given an encoding.
function decompressed(req, encoding) {
    switch (encoding) {
        case 'identity': return req;
        case 'deflate': return req.pipe(zlib.createInflate());
        case 'gzip': return req.pipe(zlib.createGunzip());
    }
    throw httpError(415, `Unsupported content-encoding "${encoding}".`);
}