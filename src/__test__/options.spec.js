import graphqlHTTP from '../';
import request from 'supertest-as-promised';
import koa from 'koa';

//options should be provided
it('requires an option factory function', async () => {
    expect(() => {
        graphqlHTTP();
    }).toThrowError('GraphQL middleware requires options.'); //must throw an exception
});

//options as function
it('requires option factory function to return object', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => null));
    const server = app.listen();
    let result = await request(server).get('/graphql?query={test}');
    expect(result.res.statusCode).toBe(500);
    expect(JSON.parse(result.res.text)).toEqual({
        errors: [
            {
                message:
                'GraphQL middleware option function must return an options object or a promise which will be resolved to an options object.'
            }
        ]
    });
}); //end function

//options as promise
it('requires option factory function to return object or promise of object', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => Promise.resolve(null)));
    const server = app.listen();
    let result = await request(server).get('/graphql?query={test}');
    expect(result.res.statusCode).toBe(500);
    expect(JSON.parse(result.res.text)).toEqual({
        errors: [
            {
                message:
                'GraphQL middleware option function must return an options object or a promise which will be resolved to an options object.'
            }
        ]
    });
}); //end function

it('requires option factory function to return object or promise of object with schema', async () => {
    const app = new koa();
    app.use(graphqlHTTP(() => Promise.resolve({})));
    const server = app.listen();
    let result = await request(server).get('/graphql?query={test}');
    expect(result.res.statusCode).toBe(500);
    expect(JSON.parse(result.res.text)).toEqual({
        errors: [
            {
                message:
                'GraphQL middleware options must contain a schema.'
            }
        ]
    });
}); //end function