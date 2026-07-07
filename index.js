'use strict'

const fp = require('fastify-plugin')
const { Readable } = require('node:stream')

const kAbortController = Symbol('fastify-fetch.abortController')
const requestLifecycleEnded = new DOMException('Request lifecycle ended', 'AbortError')

function createWebRequest (fastifyRequest, signal) {
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

  if (signal === undefined) {
    return new Request(url, {
      method: fastifyRequest.method,
      headers: new Headers(fastifyRequest.headers),
      body: webBody,
      duplex: webBody ? 'half' : undefined
    })
  }

  return new Request(url, {
    method: fastifyRequest.method,
    headers: new Headers(fastifyRequest.headers),
    body: webBody,
    duplex: webBody ? 'half' : undefined,
    signal
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

function abortWebRequest (request) {
  request[kAbortController]?.abort()
}

function prepareRouteOptions (options, abortControllerEnabled) {
  if (options === undefined) {
    return undefined
  }

  const routeOptions = { ...options }
  delete routeOptions.abortController
  if (!abortControllerEnabled) {
    return routeOptions
  }

  const hooks = routeOptions.onRequestAbort
  if (hooks === undefined) {
    routeOptions.onRequestAbort = abortWebRequest
  } else if (Array.isArray(hooks)) {
    routeOptions.onRequestAbort = [abortWebRequest, ...hooks]
  } else {
    routeOptions.onRequestAbort = [abortWebRequest, hooks]
  }

  return routeOptions
}

async function fastifyFetch (fastify, options) {
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser('*', function (request, payload, done) {
    done(null, payload)
  })

  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']
  const fetch = {}

  for (const method of methods) {
    fetch[method] = (path, options, handler) => {
      if (handler === undefined) {
        handler = options
        options = undefined
      }

      const abortControllerEnabled = options?.abortController === true
      const routeOptions = prepareRouteOptions(options, abortControllerEnabled)
      let routeHandler

      if (abortControllerEnabled) {
        routeHandler = async function handleRequestWithAbortController (request, reply) {
          const abortController = new AbortController()
          request[kAbortController] = abortController

          try {
            const webRequest = createWebRequest(request, abortController.signal)
            const ctx = {
              log: request.log,
              server: fastify,
              params: request.params,
              query: request.query,
              request,
              reply,
              abortController
            }

            const webResponse = await handler(webRequest, ctx)
            await sendWebResponse(reply, webResponse)
          } finally {
            delete request[kAbortController]
            abortController.abort(requestLifecycleEnded)
          }
        }
      } else {
        routeHandler = async function handleRequest (request, reply) {
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
        }
      }

      if (routeOptions === undefined) {
        fastify[method](path, routeHandler)
      } else {
        fastify[method](path, routeOptions, routeHandler)
      }
    }
  }

  fastify.decorate('fetch', fetch)
}

module.exports = fp(fastifyFetch, {
  fastify: '>=5.0.0',
  name: '@fastify/fetch'
})
