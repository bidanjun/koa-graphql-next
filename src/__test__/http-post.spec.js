// describe('POST functionality', () => {
//       it('allows POST with JSON encoding', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema
//         }));

//         const response = await request(app)
//           .post(urlString()).send({ query: '{test}' });

//         expect(response.text).to.equal(
//           '{"data":{"test":"Hello World"}}'
//         );
//       });

//       it('Allows sending a mutation via POST', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({ schema: TestSchema }));

//         const response = await request(app)
//           .post(urlString())
//           .send({ query: 'mutation TestMutation { writeTest { test } }' });

//         expect(response.status).to.equal(200);
//         expect(response.text).to.equal(
//           '{"data":{"writeTest":{"test":"Hello World"}}}'
//         );
//       });

//       it('allows POST with url encoding', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema
//         }));

//         const response = await request(app)
//           .post(urlString())
//           .send(stringify({ query: '{test}' }));

//         expect(response.text).to.equal(
//           '{"data":{"test":"Hello World"}}'
//         );
//       });

//       it('supports POST JSON query with string variables', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema
//         }));

//         const response = await request(app)
//           .post(urlString())
//           .send({
//             query: 'query helloWho($who: String){ test(who: $who) }',
//             variables: JSON.stringify({ who: 'Dolly' })
//           });

//         expect(response.text).to.equal(
//           '{"data":{"test":"Hello Dolly"}}'
//         );
//       });

//       it('supports POST JSON query with JSON variables', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema
//         }));

//         const response = await request(app)
//           .post(urlString())
//           .send({
//             query: 'query helloWho($who: String){ test(who: $who) }',
//             variables: { who: 'Dolly' }
//           });

//         expect(response.text).to.equal(
//           '{"data":{"test":"Hello Dolly"}}'
//         );
//       });

//       it('supports POST url encoded query with string variables', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema
//         }));

//         const response = await request(app)
//           .post(urlString())
//           .send(stringify({
//             query: 'query helloWho($who: String){ test(who: $who) }',
//             variables: JSON.stringify({ who: 'Dolly' })
//           }));

//         expect(response.text).to.equal(
//           '{"data":{"test":"Hello Dolly"}}'
//         );
//       });

//       it('supports POST JSON query with GET variable values', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema
//         }));

//         const response = await request(app)
//           .post(urlString({
//             variables: JSON.stringify({ who: 'Dolly' })
//           }))
//           .send({ query: 'query helloWho($who: String){ test(who: $who) }' });

//         expect(response.text).to.equal(
//           '{"data":{"test":"Hello Dolly"}}'
//         );
//       });

//       it('supports POST url encoded query with GET variable values', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema
//         }));

//         const response = await request(app)
//           .post(urlString({
//             variables: JSON.stringify({ who: 'Dolly' })
//           }))
//           .send(stringify({
//             query: 'query helloWho($who: String){ test(who: $who) }'
//           }));

//         expect(response.text).to.equal(
//           '{"data":{"test":"Hello Dolly"}}'
//         );
//       });

//       it('supports POST raw text query with GET variable values', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema
//         }));

//         const response = await request(app)
//           .post(urlString({
//             variables: JSON.stringify({ who: 'Dolly' })
//           }))
//           .set('Content-Type', 'application/graphql')
//           .send('query helloWho($who: String){ test(who: $who) }');

//         expect(response.text).to.equal(
//           '{"data":{"test":"Hello Dolly"}}'
//         );
//       });

//       it('allows POST with operation name', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP(() => ({
//           schema: TestSchema
//         })));

//         const response = await request(app)
//           .post(urlString())
//           .send({
//             query: `
//               query helloYou { test(who: "You"), ...shared }
//               query helloWorld { test(who: "World"), ...shared }
//               query helloDolly { test(who: "Dolly"), ...shared }
//               fragment shared on QueryRoot {
//                 shared: test(who: "Everyone")
//               }
//             `,
//             operationName: 'helloWorld'
//           });

//         expect(JSON.parse(response.text)).to.deep.equal({
//           data: {
//             test: 'Hello World',
//             shared: 'Hello Everyone',
//           }
//         });
//       });

//       it('allows POST with GET operation name', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP(() => ({
//           schema: TestSchema
//         })));

//         const response = await request(app)
//           .post(urlString({
//             operationName: 'helloWorld'
//           }))
//           .set('Content-Type', 'application/graphql')
//           .send(`
//             query helloYou { test(who: "You"), ...shared }
//             query helloWorld { test(who: "World"), ...shared }
//             query helloDolly { test(who: "Dolly"), ...shared }
//             fragment shared on QueryRoot {
//               shared: test(who: "Everyone")
//             }
//           `);

//         expect(JSON.parse(response.text)).to.deep.equal({
//           data: {
//             test: 'Hello World',
//             shared: 'Hello Everyone',
//           }
//         });
//       });

//       it('allows other UTF charsets', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP(() => ({
//           schema: TestSchema
//         })));

//         const req = request(app)
//           .post(urlString())
//           .set('Content-Type', 'application/graphql; charset=utf-16');
//         req.write(new Buffer('{ test(who: "World") }', 'utf16le'));
//         const response = await req;

//         expect(JSON.parse(response.text)).to.deep.equal({
//           data: {
//             test: 'Hello World'
//           }
//         });
//       });

//       it('allows gzipped POST bodies', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP(() => ({
//           schema: TestSchema
//         })));

//         const data = { query: '{ test(who: "World") }' };
//         const json = JSON.stringify(data);
//         const gzippedJson = await promiseTo(cb => zlib.gzip(json, cb));

//         const req = request(app)
//           .post(urlString())
//           .set('Content-Type', 'application/json')
//           .set('Content-Encoding', 'gzip');
//         req.write(gzippedJson);
//         const response = await req;

//         expect(JSON.parse(response.text)).to.deep.equal({
//           data: {
//             test: 'Hello World'
//           }
//         });
//       });

//       it('allows deflated POST bodies', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP(() => ({
//           schema: TestSchema
//         })));

//         const data = { query: '{ test(who: "World") }' };
//         const json = JSON.stringify(data);
//         const deflatedJson = await promiseTo(cb => zlib.deflate(json, cb));

//         const req = request(app)
//           .post(urlString())
//           .set('Content-Type', 'application/json')
//           .set('Content-Encoding', 'deflate');
//         req.write(deflatedJson);
//         const response = await req;

//         expect(JSON.parse(response.text)).to.deep.equal({
//           data: {
//             test: 'Hello World'
//           }
//         });
//       });

//       it('allows for pre-parsed POST bodies', async () => {
//         // Note: this is not the only way to handle file uploads with GraphQL,
//         // but it is terse and illustrative of using express-graphql and multer
//         // together.

//         // A simple schema which includes a mutation.
//         const UploadedFileType = new GraphQLObjectType({
//           name: 'UploadedFile',
//           fields: {
//             originalname: { type: GraphQLString },
//             mimetype: { type: GraphQLString }
//           }
//         });

//         const TestMutationSchema = new GraphQLSchema({
//           query: new GraphQLObjectType({
//             name: 'QueryRoot',
//             fields: {
//               test: { type: GraphQLString }
//             }
//           }),
//           mutation: new GraphQLObjectType({
//             name: 'MutationRoot',
//             fields: {
//               uploadFile: {
//                 type: UploadedFileType,
//                 resolve(rootValue) {
//                   // For this test demo, we're just returning the uploaded
//                   // file directly, but presumably you might return a Promise
//                   // to go store the file somewhere first.
//                   return rootValue.request.file;
//                 }
//               }
//             }
//           })
//         });

//         const app = server();

//         // Multer provides multipart form data parsing.
//         const storage = multer.memoryStorage();
//         app.use(urlString(), multer({ storage }).single('file'));

//         // Providing the request as part of `rootValue` allows it to
//         // be accessible from within Schema resolve functions.
//         app.use(urlString(), graphqlHTTP(req => {
//           return {
//             schema: TestMutationSchema,
//             rootValue: { request: req }
//           };
//         }));

//         const response = await request(app)
//           .post(urlString())
//           .field('query', `mutation TestMutation {
//             uploadFile { originalname, mimetype }
//           }`)
//           .attach('file', __filename);

//         expect(JSON.parse(response.text)).to.deep.equal({
//           data: {
//             uploadFile: {
//               originalname: 'http-test.js',
//               mimetype: 'application/javascript'
//             }
//           }
//         });
//       });

//       it('allows for pre-parsed POST using application/graphql', async () => {
//         const app = server();
//         app.use(bodyParser.text({ type: 'application/graphql' }));

//         app.use(urlString(), graphqlHTTP({ schema: TestSchema }));

//         const req = request(app)
//           .post(urlString())
//           .set('Content-Type', 'application/graphql');
//         req.write(new Buffer('{ test(who: "World") }'));
//         const response = await req;

//         expect(JSON.parse(response.text)).to.deep.equal({
//           data: {
//             test: 'Hello World'
//           }
//         });
//       });

//       it('does not accept unknown pre-parsed POST string', async () => {
//         const app = server();
//         app.use(bodyParser.text({ type: '*/*' }));

//         app.use(urlString(), graphqlHTTP({ schema: TestSchema }));

//         const req = request(app)
//           .post(urlString());
//         req.write(new Buffer('{ test(who: "World") }'));
//         const error = await catchError(req);

//         expect(error.response.status).to.equal(400);
//         expect(JSON.parse(error.response.text)).to.deep.equal({
//           errors: [ { message: 'Must provide query string.' } ]
//         });
//       });

//       it('does not accept unknown pre-parsed POST raw Buffer', async () => {
//         const app = server();
//         app.use(bodyParser.raw({ type: '*/*' }));

//         app.use(urlString(), graphqlHTTP({ schema: TestSchema }));

//         const req = request(app)
//           .post(urlString())
//           .set('Content-Type', 'application/graphql');
//         req.write(new Buffer('{ test(who: "World") }'));
//         const error = await catchError(req);

//         expect(error.response.status).to.equal(400);
//         expect(JSON.parse(error.response.text)).to.deep.equal({
//           errors: [ { message: 'Must provide query string.' } ]
//         });
//       });
//     });