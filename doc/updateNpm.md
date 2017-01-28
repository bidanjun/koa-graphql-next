
## update version in pakage.jsson
"version": "1.0.6"

## build it
  npm run build
  we have scrips in pacakge.json
    "clean": "./node_modules/.bin/rimraf lib",
    "build": "./node_modules/.bin/babel src --out-dir lib --source-maps false --ignore __test__ --extensions .js,.jsx --copy-files",
    "prepublish": "npm run clean && npm run build"
  and should have a index.js at root folder.

## tag it at develop branch
create tag at develop branch
git tag "v1.0.2"

push to remote
git push origin tag "v1.0.2"

remove remote tag:
D:\koa-graphql-next>git push origin --delete tag "v1.0.2"


## publish to npm
npm publish


