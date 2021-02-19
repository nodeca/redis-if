/* global it, beforeEach, afterEach */

'use strict'

const assert = require('assert')
const Redis = require('ioredis')

let redis

const ns = 'redis-if-' + String(Math.random()).slice(2, 10)

beforeEach(async function () {
  redis = new Redis('redis://localhost/3')
  redis.defineCommand('transaction', { lua: require('../').script, numberOfKeys: 0 })
  await redis.flushdb()
})

afterEach(async function clearNamespace () {
  await redis.flushdb()
  await redis.quit()
})

it('should execute commands without conditions', async function () {
  const res = await redis.transaction(JSON.stringify({
    if: [],
    exec: [
      ['set', `${ns}foo`, 'aaa'],
      ['set', `${ns}bar`, 'bbb']
    ]
  }))

  assert.strictEqual(res, 1)
  assert.strictEqual(await redis.get(`${ns}foo`), 'aaa')
  assert.strictEqual(await redis.get(`${ns}bar`), 'bbb')
})

it('should execute conditions without commands', async function () {
  await redis.set(`${ns}foo`, 'aaa')
  await redis.set(`${ns}bar`, 'bbb')

  const res = await redis.transaction(JSON.stringify({
    if: [
      ['aaa', '==', ['get', `${ns}foo`]],
      ['bbb', '==', ['get', `${ns}bar`]]
    ],
    exec: []
  }))

  assert.strictEqual(res, 1)
  assert.strictEqual(await redis.get(`${ns}foo`), 'aaa')
  assert.strictEqual(await redis.get(`${ns}bar`), 'bbb')
})

it('should execute conditions until one fails', async function () {
  const res = await redis.transaction(JSON.stringify({
    if: [
      [1, '==', ['sadd', `${ns}key`, 'aaa']],
      [1, '==', ['sadd', `${ns}key`, 'bbb']],
      ['fail', '==', ['get', `${ns}foo`]],
      [1, '==', ['sadd', `${ns}key`, 'ccc']]
    ],
    exec: [
      ['sadd', `${ns}key`, 'should not be written']
    ]
  }))

  assert.strictEqual(res, 0)
  assert.deepStrictEqual((await redis.smembers(`${ns}key`)).sort(), ['aaa', 'bbb'])
})

it('should execute conditions on success', async function () {
  const res = await redis.transaction(JSON.stringify({
    if: [
      [1, '==', ['sadd', `${ns}key`, 'aaa']],
      [0, '==', ['sadd', `${ns}key`, 'aaa']]
    ],
    exec: [
      ['set', `${ns}result`, 'ok']
    ]
  }))

  assert.strictEqual(res, 1)
  assert.strictEqual(await redis.get(`${ns}result`), 'ok')
})

it('should support == operator', async function () {
  await redis.set(`${ns}foo`, 'bbb')

  assert.strictEqual(await redis.transaction(JSON.stringify({
    if: [['bbb', '==', ['get', `${ns}foo`]]],
    exec: []
  })), 1)

  assert.strictEqual(await redis.transaction(JSON.stringify({
    if: [['ccc', '==', ['get', `${ns}foo`]]],
    exec: []
  })), 0)
})

it('should support != operator', async function () {
  await redis.set(`${ns}foo`, 'bbb')

  assert.strictEqual(await redis.transaction(JSON.stringify({
    if: [['ccc', '!=', ['get', `${ns}foo`]]],
    exec: []
  })), 1)

  assert.strictEqual(await redis.transaction(JSON.stringify({
    if: [['bbb', '!=', ['get', `${ns}foo`]]],
    exec: []
  })), 0)
})

it('should support > operator', async function () {
  await redis.set(`${ns}foo`, 'bbb')

  assert.strictEqual(await redis.transaction(JSON.stringify({
    if: [['ccc', '>', ['get', `${ns}foo`]]],
    exec: []
  })), 1)

  assert.strictEqual(await redis.transaction(JSON.stringify({
    if: [['aaa', '>', ['get', `${ns}foo`]]],
    exec: []
  })), 0)
})

it('should support < operator', async function () {
  await redis.set(`${ns}foo`, 'bbb')

  assert.strictEqual(await redis.transaction(JSON.stringify({
    if: [['aaa', '<', ['get', `${ns}foo`]]],
    exec: []
  })), 1)

  assert.strictEqual(await redis.transaction(JSON.stringify({
    if: [['ccc', '<', ['get', `${ns}foo`]]],
    exec: []
  })), 0)
})

it('should check == operator if there are only 2 arguments', async function () {
  await redis.set(`${ns}foo`, 'bbb')

  assert.strictEqual(await redis.transaction(JSON.stringify({
    if: [['bbb', ['get', `${ns}foo`]]],
    exec: []
  })), 1)

  assert.strictEqual(await redis.transaction(JSON.stringify({
    if: [['ccc', ['get', `${ns}foo`]]],
    exec: []
  })), 0)
})

it('should return an error on invalid operator', async function () {
  await assert.rejects(async () => {
    await redis.transaction(JSON.stringify({
      if: [['OK', '%%', ['set', `${ns}foo`, 'bbb']]],
      exec: []
    }))
  }, /invalid operator "%%"/)
})
