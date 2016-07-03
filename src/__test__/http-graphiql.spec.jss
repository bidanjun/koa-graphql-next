//  describe('Built-in GraphiQL support', () => {
//       it('does not renders GraphiQL if no opt-in', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({ schema: TestSchema }));

//         const response = await request(app)
//           .get(urlString({ query: '{test}' }))
//           .set('Accept', 'text/html');

//         expect(response.status).to.equal(200);
//         expect(response.type).to.equal('application/json');
//         expect(response.text).to.equal(
//           '{"data":{"test":"Hello World"}}'
//         );
//       });

//       it('presents GraphiQL when accepting HTML', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           graphiql: true
//         }));

//         const response = await request(app)
//           .get(urlString({ query: '{test}' }))
//           .set('Accept', 'text/html');

//         expect(response.status).to.equal(200);
//         expect(response.type).to.equal('text/html');
//         expect(response.text).to.include('{test}');
//         expect(response.text).to.include('graphiql.min.js');
//       });

//       it('contains a pre-run response within GraphiQL', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           graphiql: true
//         }));

//         const response = await request(app)
//           .get(urlString({ query: '{test}' }))
//           .set('Accept', 'text/html');

//         expect(response.status).to.equal(200);
//         expect(response.type).to.equal('text/html');
//         expect(response.text).to.include(
//           'response: ' + JSON.stringify(
//             JSON.stringify({ data: { test: 'Hello World' } }, null, 2)
//           )
//         );
//       });

//       it('contains a pre-run operation name within GraphiQL', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           graphiql: true
//         }));

//         const response = await request(app)
//           .get(urlString({
//             query: 'query A{a:test} query B{b:test}',
//             operationName: 'B'
//           }))
//           .set('Accept', 'text/html');

//         expect(response.status).to.equal(200);
//         expect(response.type).to.equal('text/html');
//         expect(response.text).to.include(
//           'response: ' + JSON.stringify(
//             JSON.stringify({ data: { b: 'Hello World' } }, null, 2)
//           )
//         );
//         expect(response.text).to.include('operationName: "B"');
//       });

//       it('escapes HTML in queries within GraphiQL', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           graphiql: true
//         }));

//         const error = await catchError(
//           request(app).get(urlString({ query: '</script><script>alert(1)</script>' }))
//                       .set('Accept', 'text/html')
//         );

//         expect(error.response.status).to.equal(400);
//         expect(error.response.type).to.equal('text/html');
//         expect(error.response.text).to.not.include('</script><script>alert(1)</script>');
//       });

//       it('escapes HTML in variables within GraphiQL', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           graphiql: true
//         }));

//         const response = await request(app).get(urlString({
//           query: 'query helloWho($who: String) { test(who: $who) }',
//           variables: JSON.stringify({
//             who: '</script><script>alert(1)</script>'
//           })
//         })) .set('Accept', 'text/html');

//         expect(response.status).to.equal(200);
//         expect(response.type).to.equal('text/html');
//         expect(response.text).to.not.include('</script><script>alert(1)</script>');
//       });

//       it('GraphiQL renders provided variables', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           graphiql: true
//         }));

//         const response = await request(app)
//           .get(urlString({
//             query: 'query helloWho($who: String) { test(who: $who) }',
//             variables: JSON.stringify({ who: 'Dolly' })
//           }))
//           .set('Accept', 'text/html');

//         expect(response.status).to.equal(200);
//         expect(response.type).to.equal('text/html');
//         expect(response.text).to.include(
//           'variables: ' + JSON.stringify(
//             JSON.stringify({ who: 'Dolly' }, null, 2)
//           )
//         );
//       });

//       it('GraphiQL accepts an empty query', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           graphiql: true
//         }));

//         const response = await request(app)
//           .get(urlString())
//           .set('Accept', 'text/html');

//         expect(response.status).to.equal(200);
//         expect(response.type).to.equal('text/html');
//         expect(response.text).to.include('response: null');
//       });

//       it('GraphiQL accepts a mutation query - does not execute it', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           graphiql: true
//         }));

//         const response = await request(app)
//           .get(urlString({
//             query: 'mutation TestMutation { writeTest { test } }'
//           }))
//           .set('Accept', 'text/html');

//         expect(response.status).to.equal(200);
//         expect(response.type).to.equal('text/html');
//         expect(response.text).to.include(
//           'query: "mutation TestMutation { writeTest { test } }"'
//         );
//         expect(response.text).to.include('response: null');
//       });

//       it('returns HTML if preferred', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           graphiql: true
//         }));

//         const response = await request(app)
//           .get(urlString({ query: '{test}' }))
//           .set('Accept', 'text/html,application/json');

//         expect(response.status).to.equal(200);
//         expect(response.type).to.equal('text/html');
//         expect(response.text).to.include('graphiql.min.js');
//       });

//       it('returns JSON if preferred', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           graphiql: true
//         }));

//         const response = await request(app)
//           .get(urlString({ query: '{test}' }))
//           .set('Accept', 'application/json,text/html');

//         expect(response.status).to.equal(200);
//         expect(response.type).to.equal('application/json');
//         expect(response.text).to.equal(
//           '{"data":{"test":"Hello World"}}'
//         );
//       });

//       it('prefers JSON if unknown accept', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           graphiql: true
//         }));

//         const response = await request(app)
//           .get(urlString({ query: '{test}' }))
//           .set('Accept', 'unknown');

//         expect(response.status).to.equal(200);
//         expect(response.type).to.equal('application/json');
//         expect(response.text).to.equal(
//           '{"data":{"test":"Hello World"}}'
//         );
//       });

//       it('prefers JSON if explicitly requested raw response', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           graphiql: true
//         }));

//         const response = await request(app)
//           .get(urlString({ query: '{test}', raw: '' }))
//           .set('Accept', 'text/html');

//         expect(response.status).to.equal(200);
//         expect(response.type).to.equal('application/json');
//         expect(response.text).to.equal(
//           '{"data":{"test":"Hello World"}}'
//         );
//       });
//     });

//     describe('Custom validation rules', () => {
//       const AlwaysInvalidRule = function (context) {
//         return {
//           enter() {
//             context.reportError(new GraphQLError(
//               'AlwaysInvalidRule was really invalid!'
//             ));
//             return BREAK;
//           }
//         };
//       };

//       it('Do not execute a query if it do not pass the custom validation.', async() => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           validationRules: [ AlwaysInvalidRule ],
//           pretty: true,
//         }));

//         const error = await catchError(
//           request(app)
//             .get(urlString({
//               query: '{thrower}',
//             }))
//         );

//         expect(error.response.status).to.equal(400);
//         expect(JSON.parse(error.response.text)).to.deep.equal({
//           errors: [
//             {
//               message: 'AlwaysInvalidRule was really invalid!'
//             },
//           ]
//         });

//       });
//     });
//   });
// });
