import Fastify from 'fastify'
import fastifyFetch from './index.js'

const fastify = Fastify({ logger: true })

await fastify.register(fastifyFetch)

fastify.fetch.get('/hello', async (request, ctx) => {
  ctx.log.info('handling request')
  return new Response('Hello World')
})

fastify.fetch.get('/users/:id', async (request, ctx) => {
  return Response.json({ id: ctx.params.id, name: 'John Doe' })
})

fastify.fetch.post('/data', async (request, ctx) => {
  const body = await request.json()
  return Response.json({ received: body })
})

fastify.fetch.get('/search', async (request, ctx) => {
  return Response.json({ query: ctx.query })
})

await fastify.listen({ port: 3000 })
