
import request from 'supertest-as-promised';
import koa from 'koa';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLError,
  BREAK
} from 'graphql';
import graphqlHTTP from '../';
import convert from 'koa-convert';
import session from 'koa-session';
import genericSession from 'koa-generic-session';
import { urlString, promiseTo, catchError} from './schema';

it('handles koa-session for GraphQL', async () => {
      const app = new koa();
      app.keys = [ 'my secret' ];
      app.use(convert(session(app)));
      app.use(async (ctx,next) => {
        ctx.session.id = 'first';        
        await next();
      });
    const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'sessionType',
          fields: {
            sessionId: {
              type: GraphQLString,
              resolve(parentValue, args, contextCtx) {
                      //here only session.id="first"
                      //console.log("contextCtx.session is------->",contextCtx.session)
                       return contextCtx.session.id;
              }
            }
          }
        })
      });
       app.use(graphqlHTTP((ctx) => ({
        schema: schema,
         context: ctx
      })));
      
      const response = await request(app.listen())
        .get(urlString({
          query: '{sessionId}'
        }));
      expect(response.res.text).toBe('{"data":{"sessionId":"first"}}');
});

it('handles generic session for GraphQL', async () => {
      const app = new koa();
      app.keys = ['id','token'];
      app.use(convert(genericSession({
        key: 'session'
      })));

      app.use(async (ctx,next) => {
        ctx.session.id = 'first';        
        await next();
      });
    const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'SessionType',
          fields: {
            sessionId: {
              type: GraphQLString,
              resolve(parentValue, args, contextCtx) {
                  //here has session id and cookies
                  //console.log("contextCtx.session is======>",contextCtx.session)
                       return contextCtx.session.id;
              }
            }
          }
        })
      });
      app.use(graphqlHTTP({
        schema: schema
      }));
      
      const response = await request(app.listen())
        .get(urlString({
          query: '{sessionId}'
        }));
      expect(response.res.text).toBe('{"data":{"sessionId":"first"}}');
});