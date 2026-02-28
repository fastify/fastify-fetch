import fastify, { FastifyInstance, FastifyPluginAsync, FastifyBaseLogger, FastifyRequest, FastifyReply } from 'fastify'
import { expectType } from 'tsd'
import * as fastifyFetchStar from '../..'
import fastifyFetch, {
  FetchContext,
  FetchHandler,
  FetchRoutes,
  fastifyFetch as fastifyFetchNamed
} from '../..'

import fastifyFetchCjsImport = require('../..')
const fastifyFetchCjs = require('../..')

const app: FastifyInstance = fastify()

app.register(fastifyFetch)
app.register(fastifyFetchNamed)
app.register(fastifyFetchCjs)
app.register(fastifyFetchCjsImport.default)
app.register(fastifyFetchCjsImport.fastifyFetch)
app.register(fastifyFetchStar.default)
app.register(fastifyFetchStar.fastifyFetch)

expectType<FastifyPluginAsync>(fastifyFetch)
expectType<FastifyPluginAsync>(fastifyFetchNamed)
expectType<any>(fastifyFetchCjs)

app
  .register(fastifyFetch)
  .after(() => {
    expectType<FetchRoutes>(app.fetch)

    app.fetch.get('/test', async (request, ctx) => {
      expectType<Request>(request)
      expectType<FetchContext>(ctx)
      expectType<FastifyBaseLogger>(ctx.log)
      expectType<FastifyInstance>(ctx.server)
      expectType<Record<string, string>>(ctx.params)
      expectType<Record<string, string>>(ctx.query)
      expectType<FastifyRequest>(ctx.request)
      expectType<FastifyReply>(ctx.reply)
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
