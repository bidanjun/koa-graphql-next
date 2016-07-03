//   describe('Error handling functionality', () => {
//       it('handles field errors caught by GraphQL', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema
//         }));

//         const response = await request(app)
//           .get(urlString({
//             query: '{thrower}',
//           }));

//         expect(response.status).to.equal(200);
//         expect(JSON.parse(response.text)).to.deep.equal({
//           data: null,
//           errors: [ {
//             message: 'Throws!',
//             locations: [ { line: 1, column: 2 } ]
//           } ]
//         });
//       });

//       it('allows for custom error formatting to sanitize', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           formatError(error) {
//             return { message: 'Custom error format: ' + error.message };
//           }
//         }));

//         const response = await request(app)
//           .get(urlString({
//             query: '{thrower}',
//           }));

//         expect(response.status).to.equal(200);
//         expect(JSON.parse(response.text)).to.deep.equal({
//           data: null,
//           errors: [ {
//             message: 'Custom error format: Throws!',
//           } ]
//         });
//       });

//       it('allows for custom error formatting to elaborate', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           formatError(error) {
//             return {
//               message: error.message,
//               locations: error.locations,
//               stack: 'Stack trace'
//             };
//           }
//         }));

//         const response = await request(app)
//           .get(urlString({
//             query: '{thrower}',
//           }));

//         expect(response.status).to.equal(200);
//         expect(JSON.parse(response.text)).to.deep.equal({
//           data: null,
//           errors: [ {
//             message: 'Throws!',
//             locations: [ { line: 1, column: 2 } ],
//             stack: 'Stack trace',
//           } ]
//         });
//       });

//       it('handles syntax errors caught by GraphQL', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//         }));

//         const error = await catchError(
//           request(app)
//             .get(urlString({
//               query: 'syntaxerror',
//             }))
//         );

//         expect(error.response.status).to.equal(400);
//         expect(JSON.parse(error.response.text)).to.deep.equal({
//           errors: [ {
//             message: 'Syntax Error GraphQL request (1:1) ' +
//               'Unexpected Name \"syntaxerror\"\n\n1: syntaxerror\n   ^\n',
//             locations: [ { line: 1, column: 1 } ]
//           } ]
//         });
//       });

//       it('handles errors caused by a lack of query', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//         }));

//         const error = await catchError(
//           request(app).get(urlString())
//         );

//         expect(error.response.status).to.equal(400);
//         expect(JSON.parse(error.response.text)).to.deep.equal({
//           errors: [ { message: 'Must provide query string.' } ]
//         });
//       });

//       it('handles invalid JSON bodies', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//         }));

//         const error = await catchError(
//           request(app)
//             .post(urlString())
//             .set('Content-Type', 'application/json')
//             .send('[]')
//         );

//         expect(error.response.status).to.equal(400);
//         expect(JSON.parse(error.response.text)).to.deep.equal({
//           errors: [ { message: 'POST body sent invalid JSON.' } ]
//         });
//       });

//       it('handles incomplete JSON bodies', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//         }));

//         const error = await catchError(
//           request(app)
//             .post(urlString())
//             .set('Content-Type', 'application/json')
//             .send('{"query":')
//         );

//         expect(error.response.status).to.equal(400);
//         expect(JSON.parse(error.response.text)).to.deep.equal({
//           errors: [ { message: 'POST body sent invalid JSON.' } ]
//         });
//       });

//       it('handles plain POST text', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema
//         }));

//         const error = await catchError(
//           request(app)
//             .post(urlString({
//               variables: JSON.stringify({ who: 'Dolly' })
//             }))
//             .set('Content-Type', 'text/plain')
//             .send('query helloWho($who: String){ test(who: $who) }')
//         );

//         expect(error.response.status).to.equal(400);
//         expect(JSON.parse(error.response.text)).to.deep.equal({
//           errors: [ { message: 'Must provide query string.' } ]
//         });
//       });

//       it('handles unsupported charset', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP(() => ({
//           schema: TestSchema
//         })));

//         const error = await catchError(
//           request(app)
//             .post(urlString())
//             .set('Content-Type', 'application/graphql; charset=ascii')
//             .send('{ test(who: "World") }')
//         );

//         expect(error.response.status).to.equal(415);
//         expect(JSON.parse(error.response.text)).to.deep.equal({
//           errors: [ { message: 'Unsupported charset "ASCII".' } ]
//         });
//       });

//       it('handles unsupported utf charset', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP(() => ({
//           schema: TestSchema
//         })));

//         const error = await catchError(
//           request(app)
//             .post(urlString())
//             .set('Content-Type', 'application/graphql; charset=utf-53')
//             .send('{ test(who: "World") }')
//         );

//         expect(error.response.status).to.equal(415);
//         expect(JSON.parse(error.response.text)).to.deep.equal({
//           errors: [ { message: 'Unsupported charset "UTF-53".' } ]
//         });
//       });

//       it('handles unknown encoding', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP(() => ({
//           schema: TestSchema
//         })));

//         const error = await catchError(
//           request(app)
//             .post(urlString())
//             .set('Content-Encoding', 'garbage')
//             .send('!@#$%^*(&^$%#@')
//         );

//         expect(error.response.status).to.equal(415);
//         expect(JSON.parse(error.response.text)).to.deep.equal({
//           errors: [ { message: 'Unsupported content-encoding "garbage".' } ]
//         });
//       });

//       it('handles poorly formed variables', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({ schema: TestSchema }));

//         const error = await catchError(
//           request(app)
//             .get(urlString({
//               variables: 'who:You',
//               query: 'query helloWho($who: String){ test(who: $who) }'
//             }))
//         );

//         expect(error.response.status).to.equal(400);
//         expect(JSON.parse(error.response.text)).to.deep.equal({
//           errors: [ { message: 'Variables are invalid JSON.' } ]
//         });
//       });

//       it('handles unsupported HTTP methods', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({ schema: TestSchema }));

//         const error = await catchError(
//           request(app)
//             .put(urlString({ query: '{test}' }))
//         );

//         expect(error.response.status).to.equal(405);
//         expect(error.response.headers.allow).to.equal('GET, POST');
//         expect(JSON.parse(error.response.text)).to.deep.equal({
//           errors: [
//             { message: 'GraphQL only supports GET and POST requests.' }
//           ]
//         });
//       });

//     });