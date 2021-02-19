redis-if
========

[![CI](https://github.com/nodeca/redis-if/workflows/CI/badge.svg)](https://github.com/nodeca/redis-if/actions)
[![NPM version](https://img.shields.io/npm/v/redis-if.svg?style=flat)](https://www.npmjs.org/package/redis-if)


> Easy to use conditional transactions in redis. Effectively replaces other custom scripts.

Simple script for atomic "check & run" in Redis:

- check multiple conditions
- execute multiple commands if all conditions satisfied

Very often this pattern allows to avoid customs cripting.


Install
-------

```sh
npm install redis-if
```


API
---

Script requires single param - stringified JS object with conditions & commands.

Every condition is `[ value, compare_operator, [ redis cmd with params] ]`.
Supported operators are:

- `==`
- `!=`.
- `>`
- `<`

```js
{
  // Conditions. All must be satisfied
  if: [
    [ 1, '==', [ 'zrem', `locked`, `${prefix}${task.id}` ] ]
  ],
  // Commands to execute if all conditions satisfied
  exec: [
    [ 'zadd', 'restart', Date.now() + 5000, task.id ],
    [ 'hset', `${prefix}${task.id}`, 'state', JSON.stringify('restart') ],
    [ 'hset', `${prefix}${task.id}`, 'retries', JSON.stringify(new_retries) ]
  ]
}
```


Use
---

Sample for `ioredis`. Is has built-in script manager and easy to use.

```js
const Redis = require('redis')

const redis = new Redis()

redis.defineCommand('transaction', { lua: require('redis-if').script, numberOfKeys: 0 })

let success = await this.__redis__.transaction(JSON.stringify({
  if: [
    // apply changes only if this process aquired lock
    [ 'eq', 1, [ 'zrem', `locked`, `${prefix}${task.id}` ] ]
  ],
  exec: [
    [ 'zadd', 'restart', Date.now() + 5000, task.id ],
    [ 'hset', `${prefix}${task.id}`, 'state', JSON.stringify('restart') ],
    [ 'hset', `${prefix}${task.id}`, 'retries', JSON.stringify(new_retries) ]
  ]
}))
```


Dev notes
---------

Quik-run redis via docker:

```sh
# start
docker run -d -p 6379:6379 --name redis1 redis
# stop
docker stop redis1
docker rm redis1
```
