
# 20170226 v1.0.8

## using new graphiql version 0.9.1

# 20170131 v1.0.7

## using yarn
## update all dependencies
## move graphql.js to dev dependences

# 20170129 v1.0.6

## update graphql to v0.9.1
## using supertest,remove supertest-as-promised
## add doc for update npm.

# 20161115 v1.0.5

## change test framwork from ava to jest.
## update graphql to v0.8.1
  fix only an http error message test

# 20160827 v1.0.4
## update graphql to v0.7.0,the release note is here
    https://github.com/graphql/graphql-js/releases/tag/v0.7.0
    and express-graphql add an test for new behaver:
    https://github.com/graphql/express-graphql/commit/536f8653e9e3d8d893ae7a8e02ffed4fe3b4d88b

## context defaulting to request
   a test of session changed to this way.

## Force client to use UTF-8 encoding by setting encoding in Content-Type

## all changes from express0.53 has been review and fix on 1.04.
all commit since express-graphql 0.53 here:
1. [not need]Remove http-errors from devDependencies  
2. [not need]use res.send directly to send data not need
3. [not need]Return main promise not need
4. [not need]change Middleware definition to return promise not need
5. [changed]Force client to use UTF-8 encoding by setting encoding in Content-Type
6. [not need]graphql-express -> express-graphql in readme  
7. [not need]Return main promise PR#99
8. [not need]Remove http-errors from devDependencies
9. [changed]Force client to use UTF-8 encoding by setting encoding in Content-Type
10. [not need]Merge branch 'use-end-to-send-data' 
11. [not need]Merge branch 'chentsulin-use-end-to-send-data'
12. [changed]context defaulting to request

#20160808 v1.0.3
  add test for koa-session and koa-generic.session
  update graphql to v0.6.2
  update babel and other depends to newest.

#v1.0.2
  when using a function as argument,only pass ctx to the function.

#v1.0.1
  clean the package.json

#v1.0.0
  ported from express-graphql.
  test rewrite using ava+supertest-as-promised