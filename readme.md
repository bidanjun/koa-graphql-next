GraphQL HTTP Server Middleware
==============================

Create a GraphQL HTTP server with koa v2. it's ported from [express-graphql](https://github.com/graphql/express-graphql).
koa-graphql-next have the same api with express-graphql, and well tested like express-graphql,that's mean,and could be try
to using in product currently.

## Faq

1. only supported koa v2
2. add url to options,and default url is '/graphql'
3. using ava.js,instead of mocha in express-graphql.all test from express-graphql (now 64 tests),have been rewrited and passed.
4. ported from express-graphql,for the code,"line by line",and rewrites all the test of express-graphql,so fix many bug founded in tests.
   but,thanks for the author of these project:
   [koa-graphql by chentsulin](https://github.com/chentsulin/koa-graphql) ,thats supported koa v1 and could using in koa2 by 
      koa-convert.
   [graffiti](https://github.com/RisingStack/graffiti) it proveder a middleware for koa v1.
   [koa-graphql by Arch-Mage](https://github.com/Arch-Mage/koa-graphql/tree/next)
5. for the detail of usage,could read the test,for example how to upload files with graphql.

## Installation

```sh
npm install --save koa-graphql-next
```

Then use `koa-graphql-next` at any point as a middleware with koa@next:

```js
import graphqlHTTP from 'koa-graphql-next';

const app = new koa();

app.use( graphqlHTTP({
  schema: MyGraphQLSchema,
  graphiql: true
}));

app.listen(3000);
```

## Options

The `graphqlHTTP` function accepts the following options:

  * **`schema`**: A `GraphQLSchema` instance from [`graphql-js`][].
    A `schema` *must* be provided.

  * **`context`**: A value to pass as the `context` to the `graphql()`
    function from [`graphql-js`][].

  * **`rootValue`**: A value to pass as the `rootValue` to the `graphql()`
    function from [`graphql-js`][].

  * **`pretty`**: If `true`, any JSON response will be pretty-printed.

  * **`formatError`**: An optional function which will be used to format any
    errors produced by fulfilling a GraphQL operation. If no function is
    provided, GraphQL's default spec-compliant [`formatError`][] function will
    be used.

  * **`validationRules`**: Optional additional validation rules queries must
    satisfy in addition to those defined by the GraphQL spec.

  * **`graphiql`**: If `true`, may present [GraphiQL][] when loaded directly
    from a browser (a useful tool for debugging and exploration).

  * **`url`**: added in koa-graphql-next,An optional string for the query url.
    default value is '/graphql'.

## Debugging

During development, it's useful to get more information from errors, such as
stack traces. Providing a function to `formatError` enables this:

```js
formatError: error => ({
  message: error.message,
  locations: error.locations,
  stack: error.stack
})
```


## HTTP Usage

Once installed at a path, `koa-graphql-next` will accept requests with
the parameters:

  * **`query`**: A string GraphQL document to be executed.

  * **`variables`**: The runtime values to use for any GraphQL query variables
    as a JSON object.

  * **`operationName`**: If the provided `query` contains multiple named
    operations, this specifies which operation should be executed. If not
    provided, a 400 error will be returned if the `query` contains multiple
    named operations.

  * **`raw`**: If the `graphiql` option is enabled and the `raw` parameter is
    provided raw JSON will always be returned instead of GraphiQL even when
    loaded from a browser.

GraphQL will first look for each parameter in the URL's query-string:

```
/graphql?query=query+getUser($id:ID){user(id:$id){name}}&variables={"id":"4"}
```

If not found in the query-string, it will look in the POST request body.

If a previous middleware has already parsed the POST body, the `ctx.request.body`
value will be used. Use [`koa-multer`][] or a similar middleware to add support
for `multipart/form-data` content, which may be useful for GraphQL mutations
involving uploading files. 

If the POST body has not yet been parsed, koa-graphql-next will interpret it
depending on the provided *Content-Type* header.

  * **`application/json`**: the POST body will be parsed as a JSON
    object of parameters.

  * **`application/x-www-form-urlencoded`**: this POST body will be
    parsed as a url-encoded string of key-value pairs.

  * **`application/graphql`**: The POST body will be parsed as GraphQL
    query string, which provides the `query` parameter.


[`graphql-js`]: https://github.com/graphql/graphql-js
[`formatError`]: https://github.com/graphql/graphql-js/blob/master/src/error/formatError.js
[GraphiQL]: https://github.com/graphql/graphiql

