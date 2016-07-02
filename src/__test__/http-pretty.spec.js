//   describe('Pretty printing', () => {
//       it('supports pretty printing', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP({
//           schema: TestSchema,
//           pretty: true
//         }));

//         const response = await request(app)
//           .get(urlString({
//             query: '{test}'
//           }));

//         expect(response.text).to.equal(
//           '{\n' +
//           '  "data": {\n' +
//           '    "test": "Hello World"\n' +
//           '  }\n' +
//           '}'
//         );
//       });

//       it('supports pretty printing configured by request', async () => {
//         const app = server();

//         app.use(urlString(), graphqlHTTP(req => {
//           return {
//             schema: TestSchema,
//             pretty: ((url.parse(req.url, true) || {}).query || {}).pretty === '1'
//           };
//         }));

//         const defaultResponse = await request(app)
//           .get(urlString({
//             query: '{test}'
//           }));

//         expect(defaultResponse.text).to.equal(
//           '{"data":{"test":"Hello World"}}'
//         );

//         const prettyResponse = await request(app)
//           .get(urlString({
//             query: '{test}',
//             pretty: 1
//           }));

//         expect(prettyResponse.text).to.equal(
//           '{\n' +
//           '  "data": {\n' +
//           '    "test": "Hello World"\n' +
//           '  }\n' +
//           '}'
//         );

//         const unprettyResponse = await request(app)
//           .get(urlString({
//             query: '{test}',
//             pretty: 0
//           }));

//         expect(unprettyResponse.text).to.equal(
//           '{"data":{"test":"Hello World"}}'
//         );
//       });
//     });

//     it('will send request and response when using thunk', async () => {
//       const app = server();

//       let hasRequest = false;
//       let hasResponse = false;

//       app.use(urlString(), graphqlHTTP((req, res) => {
//         if (req) {
//           hasRequest = true;
//         }
//         if (res) {
//           hasResponse = true;
//         }
//         return { schema: TestSchema };
//       }));

//       await request(app).get(urlString({ query: '{test}' }));

//       expect(hasRequest).to.equal(true);
//       expect(hasResponse).to.equal(true);
//     });
