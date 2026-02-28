'use strict'

const fp = require('fastify-plugin')
const { Readable } = require('node:stream')

function createWebRequest (fastifyRequest) {
  const url = new URL(fastifyRequest.url, `http://${fastifyRequest.headers.host}`)
  const hasBody = !['GET', 'HEAD'].includes(fastifyRequest.method)
  const body = fastifyRequest.body

  let webBody
  if (hasBody && body) {
    if (body instanceof Readable) {
      webBody = Readable.toWeb(body)
    } else {
      throw new Error('Request body must be a Readable stream')
    }
  }

  return new Request(url, {
    method: fastifyRequest.method,
    headers: new Headers(fastifyRequest.headers),
    body: webBody,
    duplex: webBody ? 'half' : undefined
  })
}

async function sendWebResponse (fastifyReply, webResponse) {
  if (!(webResponse instanceof Response)) {
    throw new Error('Handler must return a Response object')
  }

  fastifyReply.status(webResponse.status)

  for (const [key, value] of webResponse.headers) {
    fastifyReply.header(key, value)
  }

  const body = await webResponse.arrayBuffer()
  fastifyReply.send(Buffer.from(body))
}

async function fastifyFetch (fastify, options) {
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser('*', function (request, payload, done) {
    done(null, payload)
  })

  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']
  const fetch = {}

  for (const method of methods) {
    fetch[method] = (path, handler) => {
      fastify[method](path, async (request, reply) => {
        const webRequest = createWebRequest(request)
        const ctx = {
          log: request.log,
          server: fastify,
          params: request.params,
          query: request.query,
          request,
          reply
        }

        const webResponse = await handler(webRequest, ctx)
        await sendWebResponse(reply, webResponse)
      })
    }
  }

  fastify.decorate('fetch', fetch)
}

module.exports = fp(fastifyFetch, {
  fastify: '>=5.0.0',
  name: '@fastify/fetch'
})
