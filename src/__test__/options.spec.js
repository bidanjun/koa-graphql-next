import graphqlHTTP from '../';
import test from 'ava';
import request from 'supertest-as-promised';
import koa from 'koa';

//options should be provided
test('requires an option factory function', async (t) => {
    t.throws(() => {
        graphqlHTTP();
    }, 'GraphQL middleware requires options.'); //must throw an exception
});

//options as function
test('requires option factory function to return object', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP(() => null));
    const server = app.listen();
    let result = await request(server).get('/graphql?query={test}');
    t.is(result.res.statusCode,500);
    t.deepEqual(JSON.parse(result.res.text), {
        errors: [
            {
                message:
                'GraphQL middleware option function must return an options object or a promise which will be resolved to an options object.'
            }
        ]
    });
}); //end function

//options as promise
test('requires option factory function to return object or promise of object', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP(() => Promise.resolve(null)));
    const server = app.listen();
    let result = await request(server).get('/graphql?query={test}');
    t.is(result.res.statusCode,500);
    t.deepEqual(JSON.parse(result.res.text), {
        errors: [
            {
                message:
                'GraphQL middleware option function must return an options object or a promise which will be resolved to an options object.' 
            }
        ]
    });
}); //end function

test('requires option factory function to return object or promise of object with schema', async (t) => {
    const app = new koa();
    app.use(graphqlHTTP(() => Promise.resolve({})));
    const server = app.listen();
    let result = await request(server).get('/graphql?query={test}');
    t.is(result.res.statusCode,500);
    t.deepEqual(JSON.parse(result.res.text), {
        errors: [
            {
                message:
                 'GraphQL middleware options must contain a schema.'
            }
        ]
    });
}); //end function