redis-if
========

[![CI](https://github.com/nodeca/redis-if/workflows/CI/badge.svg)](https://github.com/nodeca/redis-if/actions)
[![NPM version](https://img.shields.io/npm/v/redis-if.svg?style=flat)](https://www.npmjs.org/package/redis-if)


> Easy to use conditional transactions in Redis. Effectively replaces other custom scripts.

Simple script for atomic "check & run" in Redis:

- check multiple conditions
- execute multiple commands if all conditions are satisfied

Very often this pattern helps to avoid custom scripting.


Install
-------

```sh
npm install redis-if
```


API
---

Script requires single param - stringified JS object with conditions & commands.

Every condition is `[ value, '==' | '!=' | '>' | '<', [ redis cmd with params ] ]`.

For `'=='` you can use short form: `[ value, [ redis cmd with params ] ]`.

```js
{
  // Conditions. All must be satisfied
  if: [
    [ 'initialized', '==', [ 'sget', 'custom-state' ] ]
  ],
  // Commands to execute if all conditions are satisfied
  exec: [
    [ 'set', 'custom-state', 'finished' ],
    [ 'incr', 'custom-counter' ]
  ]
}
```


Use
---

Sample for `ioredis`. It has built-in script manager and is easy to use.

```js
const Redis = require('ioredis')

const redis = new Redis()

redis.defineCommand('transaction', { lua: require('redis-if').script, numberOfKeys: 0 })

await redis.set('custom-state', 'initialized')
await redis.set('custom-counter', 0)

// this call will change state and do another unrelated operation (increment) atomically
let success = await redis.transaction(JSON.stringify({
  if: [
    // apply changes only if this process has acquired a lock
    [ 'initialized', '==', [ 'sget', 'custom-state' ] ]
  ],
  exec: [
    [ 'set', 'custom-state', 'finished' ],
    [ 'incr', 'custom-counter' ]
  ]
}))
```

Return value is 1 if all conditions are satisfied, or 0 if one of the conditions failed.

Dev notes
---------

Quick-run redis via docker:

```sh
# start
docker run -d -p 6379:6379 --name redis1 redis
# stop
docker stop redis1
docker rm redis1
```
