'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert')
const Fastify = require('fastify')
const { Readable } = require('node:stream')
const fastifyFetch = require('../index.js')

describe('fastify-fetch', async () => {
  test('GET request returns text response', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.get('/hello', async (request, ctx) => {
      return new Response('Hello World')
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/hello'
    })

    assert.strictEqual(response.statusCode, 200)
    assert.strictEqual(response.body, 'Hello World')
  })

  test('POST request with JSON body', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.post('/data', async (request, ctx) => {
      const body = await request.json()
      return Response.json({ received: body })
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/data',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ name: 'test' })
    })

    assert.strictEqual(response.statusCode, 200)
    assert.deepStrictEqual(JSON.parse(response.body), { received: { name: 'test' } })
  })

  test('Response headers are forwarded', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.get('/headers', async (request, ctx) => {
      return new Response('ok', {
        headers: { 'x-custom-header': 'custom-value' }
      })
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/headers'
    })

    assert.strictEqual(response.headers['x-custom-header'], 'custom-value')
  })

  test('Response status codes work', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.get('/created', async (request, ctx) => {
      return new Response('created', { status: 201 })
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/created'
    })

    assert.strictEqual(response.statusCode, 201)
  })

  test('Route parameters accessible via ctx.params', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.get('/users/:id', async (request, ctx) => {
      return Response.json({ id: ctx.params.id })
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/users/123'
    })

    assert.deepStrictEqual(JSON.parse(response.body), { id: '123' })
  })

  test('Query string accessible via ctx.query', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.get('/search', async (request, ctx) => {
      return Response.json({ q: ctx.query.q })
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/search?q=hello'
    })

    assert.deepStrictEqual(JSON.parse(response.body), { q: 'hello' })
  })

  test('Logger accessible via ctx.log', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    let logCalled = false
    fastify.fetch.get('/log', async (request, ctx) => {
      assert.ok(ctx.log)
      assert.strictEqual(typeof ctx.log.info, 'function')
      logCalled = true
      return new Response('ok')
    })

    await fastify.inject({
      method: 'GET',
      url: '/log'
    })

    assert.ok(logCalled)
  })

  test('Server accessible via ctx.server', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.get('/server', async (request, ctx) => {
      assert.strictEqual(ctx.server, fastify)
      return new Response('ok')
    })

    await fastify.inject({
      method: 'GET',
      url: '/server'
    })
  })

  test('AbortController is disabled by default', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    let cachedRequest

    fastify.fetch.get('/abort-controller-disabled', async (request, ctx) => {
      cachedRequest = request
      assert.strictEqual(ctx.abortController, undefined)
      return new Response('ok')
    })

    await fastify.inject({
      method: 'GET',
      url: '/abort-controller-disabled'
    })

    assert.strictEqual(cachedRequest.signal.aborted, false)
  })

  test('AbortController accessible via ctx.abortController when enabled', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.get('/abort-controller', { abortController: true }, async (request, ctx) => {
      assert.ok(ctx.abortController instanceof AbortController)
      assert.strictEqual(request.signal, ctx.abortController.signal)
      return new Response('ok')
    })

    await fastify.inject({
      method: 'GET',
      url: '/abort-controller'
    })
  })

  test('Fastify request accessible via ctx.request', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.get('/fastify-request', async (request, ctx) => {
      assert.ok(ctx.request)
      assert.strictEqual(ctx.request.method, 'GET')
      return new Response('ok')
    })

    await fastify.inject({
      method: 'GET',
      url: '/fastify-request'
    })
  })

  test('Fastify reply accessible via ctx.reply', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.get('/fastify-reply', async (request, ctx) => {
      assert.ok(ctx.reply)
      assert.strictEqual(typeof ctx.reply.send, 'function')
      return new Response('ok')
    })

    await fastify.inject({
      method: 'GET',
      url: '/fastify-reply'
    })
  })

  test('PUT method works', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.put('/update', async (request, ctx) => {
      const body = await request.json()
      return Response.json({ updated: body })
    })

    const response = await fastify.inject({
      method: 'PUT',
      url: '/update',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ value: 'new' })
    })

    assert.deepStrictEqual(JSON.parse(response.body), { updated: { value: 'new' } })
  })

  test('DELETE method works', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.delete('/remove/:id', async (request, ctx) => {
      return Response.json({ deleted: ctx.params.id })
    })

    const response = await fastify.inject({
      method: 'DELETE',
      url: '/remove/456'
    })

    assert.deepStrictEqual(JSON.parse(response.body), { deleted: '456' })
  })

  test('PATCH method works', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.patch('/patch', async (request, ctx) => {
      const body = await request.json()
      return Response.json({ patched: body })
    })

    const response = await fastify.inject({
      method: 'PATCH',
      url: '/patch',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ field: 'patched' })
    })

    assert.deepStrictEqual(JSON.parse(response.body), { patched: { field: 'patched' } })
  })

  test('OPTIONS method works', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.options('/cors', async (request, ctx) => {
      return new Response(null, {
        status: 204,
        headers: { 'access-control-allow-origin': '*' }
      })
    })

    const response = await fastify.inject({
      method: 'OPTIONS',
      url: '/cors'
    })

    assert.strictEqual(response.statusCode, 204)
    assert.strictEqual(response.headers['access-control-allow-origin'], '*')
  })

  test('HEAD method works', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.head('/head', async (request, ctx) => {
      return new Response(null, {
        headers: { 'x-custom': 'value' }
      })
    })

    const response = await fastify.inject({
      method: 'HEAD',
      url: '/head'
    })

    assert.strictEqual(response.statusCode, 200)
    assert.strictEqual(response.headers['x-custom'], 'value')
  })

  test('All method handles multiple HTTP methods', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.all('/all', async (request) => {
      const body = request.method === 'POST' ? await request.json() : undefined
      return Response.json({ method: request.method, body })
    })

    const getResponse = await fastify.inject({
      method: 'GET',
      url: '/all'
    })

    const postResponse = await fastify.inject({
      method: 'POST',
      url: '/all',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ ok: true })
    })

    assert.strictEqual(getResponse.statusCode, 200)
    assert.deepStrictEqual(JSON.parse(getResponse.body), { method: 'GET' })
    assert.strictEqual(postResponse.statusCode, 200)
    assert.deepStrictEqual(JSON.parse(postResponse.body), { method: 'POST', body: { ok: true } })
  })

  test('onRequest hook fires', async () => {
    const fastify = Fastify()
    let hookCalled = false

    fastify.addHook('onRequest', async (request, reply) => {
      hookCalled = true
    })

    await fastify.register(fastifyFetch)

    fastify.fetch.get('/hook-test', async (request, ctx) => {
      return new Response('ok')
    })

    await fastify.inject({
      method: 'GET',
      url: '/hook-test'
    })

    assert.strictEqual(hookCalled, true)
  })

  test('preHandler hook fires', async () => {
    const fastify = Fastify()
    let hookCalled = false

    fastify.addHook('preHandler', async (request, reply) => {
      hookCalled = true
    })

    await fastify.register(fastifyFetch)

    fastify.fetch.get('/prehandler-test', async (request, ctx) => {
      return new Response('ok')
    })

    await fastify.inject({
      method: 'GET',
      url: '/prehandler-test'
    })

    assert.strictEqual(hookCalled, true)
  })

  test('route options are forwarded', async () => {
    const fastify = Fastify()
    let hookCalled = false

    await fastify.register(fastifyFetch)

    fastify.fetch.get('/route-options', {
      preHandler: async (request, reply) => {
        hookCalled = true
      }
    }, async (request, ctx) => {
      return new Response('ok')
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/route-options'
    })

    assert.strictEqual(response.statusCode, 200)
    assert.strictEqual(hookCalled, true)
  })

  test('onSend hook fires', async () => {
    const fastify = Fastify()
    let hookCalled = false

    fastify.addHook('onSend', async (request, reply, payload) => {
      hookCalled = true
      return payload
    })

    await fastify.register(fastifyFetch)

    fastify.fetch.get('/onsend-test', async (request, ctx) => {
      return new Response('ok')
    })

    await fastify.inject({
      method: 'GET',
      url: '/onsend-test'
    })

    assert.strictEqual(hookCalled, true)
  })

  test('onResponse hook fires', async () => {
    const fastify = Fastify()
    let hookCalled = false

    fastify.addHook('onResponse', async (request, reply) => {
      hookCalled = true
    })

    await fastify.register(fastifyFetch)

    fastify.fetch.get('/onresponse-test', async (request, ctx) => {
      return new Response('ok')
    })

    await fastify.inject({
      method: 'GET',
      url: '/onresponse-test'
    })

    assert.strictEqual(hookCalled, true)
  })

  test('onError hook fires on handler error', async () => {
    const fastify = Fastify()
    let hookCalled = false

    fastify.addHook('onError', async (request, reply, error) => {
      hookCalled = true
    })

    await fastify.register(fastifyFetch)

    fastify.fetch.get('/onerror-test', async (request, ctx) => {
      throw new Error('test error')
    })

    await fastify.inject({
      method: 'GET',
      url: '/onerror-test'
    })

    assert.strictEqual(hookCalled, true)
  })

  test('handler must return Response object', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.get('/invalid-response', async (request, ctx) => {
      return 'not a response'
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/invalid-response'
    })

    assert.strictEqual(response.statusCode, 500)
    assert.ok(response.body.includes('Handler must return a Response object'))
  })

  test('request body must be a Readable stream', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.post('/invalid-body', {
      preHandler: async request => {
        request.body = { invalid: true }
      }
    }, async () => {
      return new Response('unexpected response')
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/invalid-body',
      payload: 'body'
    })

    assert.strictEqual(response.statusCode, 500)
    assert.ok(response.body.includes('Request body must be a Readable stream'))
  })

  test('abort hook handles a body-bearing request and preserves a scalar hook', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    let routeAbortHooks
    fastify.addHook('onRoute', options => {
      if (options.url === '/abort-body') {
        routeAbortHooks = options.onRequestAbort
      }
    })

    const userAbortHook = async request => {}

    fastify.fetch.post('/abort-body', {
      abortController: true,
      onRequestAbort: userAbortHook
    }, async (request, ctx) => {
      assert.strictEqual(routeAbortHooks.length, 2)
      assert.strictEqual(routeAbortHooks[1], userAbortHook)

      routeAbortHooks[0](ctx.request)
      assert.strictEqual(request.signal.aborted, true)

      return Response.json(await request.json())
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/abort-body',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ covered: true })
    })

    assert.strictEqual(response.statusCode, 200)
    assert.deepStrictEqual(JSON.parse(response.body), { covered: true })
  })

  test('abort hook preserves an array of user hooks in order', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    let routeAbortHooks
    fastify.addHook('onRoute', options => {
      if (options.url === '/abort-hooks') {
        routeAbortHooks = options.onRequestAbort
      }
    })

    const firstUserHook = async request => {}
    const secondUserHook = async request => {}

    fastify.fetch.post('/abort-hooks', {
      abortController: true,
      onRequestAbort: [firstUserHook, secondUserHook]
    }, async () => {
      return new Response('ok')
    })

    assert.strictEqual(routeAbortHooks.length, 3)
    assert.deepStrictEqual(routeAbortHooks.slice(1), [firstUserHook, secondUserHook])
  })

  test('Request must be aborted after the handler completes when enabled', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    let cachedRequest

    fastify.fetch.get('/caching-request', { abortController: true }, async (request, ctx) => {
      cachedRequest = request
      return new Response('response')
    })

    await fastify.inject({
      method: 'GET',
      url: '/caching-request'
    })

    assert.ok(cachedRequest.signal.aborted)
  })

  test('Request must be aborted after the handler throws an error when enabled', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    let cachedRequest

    fastify.fetch.get('/throwing-error', { abortController: true }, async (request, ctx) => {
      cachedRequest = request
      throw new Error('Unexpected exception raised')
    })

    await fastify.inject({
      method: 'GET',
      url: '/throwing-error'
    })

    assert.ok(cachedRequest.signal.aborted)
  })

  test('regular routes keep the default JSON parser', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.post('/regular', async (request) => {
      return { body: request.body }
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/regular',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ name: 'test' })
    })

    assert.strictEqual(response.statusCode, 200)
    assert.deepStrictEqual(JSON.parse(response.body), { body: { name: 'test' } })
  })

  test('fetch routes stream request bodies without changing regular route parsers', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.post('/fetch', async (request) => {
      return Response.json({ body: await request.json() })
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/fetch',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ name: 'fetch' })
    })

    assert.strictEqual(response.statusCode, 200)
    assert.deepStrictEqual(JSON.parse(response.body), { body: { name: 'fetch' } })
  })

  test('request URL uses forwarded protocol when trustProxy is enabled', async () => {
    const fastify = Fastify({ trustProxy: true })
    await fastify.register(fastifyFetch)

    fastify.fetch.get('/url', async (request) => {
      return Response.json({ url: request.url })
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/url?x=1',
      headers: {
        host: 'example.test',
        'x-forwarded-proto': 'https'
      }
    })

    assert.strictEqual(response.statusCode, 200)
    assert.deepStrictEqual(JSON.parse(response.body), { url: 'https://example.test/url?x=1' })
  })

  test('response bodies are sent as streams', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.get('/stream', async () => {
      const stream = new ReadableStream({
        start (controller) {
          controller.enqueue(new TextEncoder().encode('hello'))
          controller.enqueue(new TextEncoder().encode(' stream'))
          controller.close()
        }
      })

      return new Response(stream)
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/stream'
    })

    assert.strictEqual(response.statusCode, 200)
    assert.strictEqual(response.body, 'hello stream')
  })

  test('node readable response bodies are sent as streams', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyFetch)

    fastify.fetch.get('/node-stream', async () => {
      return new Response(Readable.toWeb(Readable.from(['node ', 'stream'])))
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/node-stream'
    })

    assert.strictEqual(response.statusCode, 200)
    assert.strictEqual(response.body, 'node stream')
  })
})
