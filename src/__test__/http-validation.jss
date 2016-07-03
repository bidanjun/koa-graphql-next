
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
