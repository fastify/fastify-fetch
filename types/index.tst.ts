import fastify, {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyBaseLogger,
  FastifyRequest,
  FastifyReply
} from 'fastify'
import { expect } from 'tstyche'
import * as fastifyFetchStar from '..'
import fastifyFetch, {
  FetchContext,
  FetchHandler,
  FetchRoutes,
  fastifyFetch as fastifyFetchNamed
} from '..'

import fastifyFetchCjsImport = require('..')
const fastifyFetchCjs = require('../..')

const app: FastifyInstance = fastify()

app.register(fastifyFetch)
app.register(fastifyFetchNamed)
app.register(fastifyFetchCjs)
app.register(fastifyFetchCjsImport.default)
app.register(fastifyFetchCjsImport.fastifyFetch)
app.register(fastifyFetchStar.default)
app.register(fastifyFetchStar.fastifyFetch)

expect(fastifyFetch).type.toBe<FastifyPluginAsync>()
expect(fastifyFetchNamed).type.toBe<FastifyPluginAsync>()
expect(fastifyFetchCjs).type.toBe<any>()

app.register(fastifyFetch).after(() => {
  expect(app.fetch).type.toBe<FetchRoutes>()

  app.fetch.get('/test', async (request, ctx) => {
    expect(request).type.toBe<Request>()
    expect(ctx).type.toBe<FetchContext>()
    expect(ctx.log).type.toBe<FastifyBaseLogger>()
    expect(ctx.server).type.toBe<FastifyInstance>()
    expect(ctx.params).type.toBe<Record<string, string>>()
    expect(ctx.query).type.toBe<Record<string, string>>()
    expect(ctx.request).type.toBe<FastifyRequest>()
    expect(ctx.reply).type.toBe<FastifyReply>()
    return new Response('ok')
  })

  app.fetch.post('/data', async (request, ctx) => {
    return Response.json({ ok: true })
  })

  app.fetch.put('/update', async (request, ctx) => {
    return new Response('updated')
  })

  app.fetch.delete('/remove', async (request, ctx) => {
    return new Response('deleted')
  })

  app.fetch.patch('/patch', async (request, ctx) => {
    return new Response('patched')
  })

  app.fetch.options('/options', async (request, ctx) => {
    return new Response(null, { status: 204 })
  })

  app.fetch.head('/head', async (request, ctx) => {
    return new Response(null)
  })
})

const handler: FetchHandler = async (request, ctx) => {
  return new Response('handler')
}

expect(handler).type.toBe<FetchHandler>()
