import { FastifyPluginAsync, FastifyInstance, FastifyBaseLogger, FastifyRequest, FastifyReply, RouteShorthandOptions } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    fetch: fastifyFetch.FetchRoutes
  }
}

type FastifyFetchPlugin = FastifyPluginAsync<NonNullable<fastifyFetch.FastifyFetchOptions>>

declare namespace fastifyFetch {
  export interface FetchContext {
    log: FastifyBaseLogger
    server: FastifyInstance
    params: Record<string, string>
    query: Record<string, string>
    request: FastifyRequest
    reply: FastifyReply
    abortController?: AbortController
  }

  export interface FetchContextWithAbortController extends FetchContext {
    abortController: AbortController
  }

  export interface FetchRouteOptions extends RouteShorthandOptions {
    abortController?: boolean
  }

  export type FetchHandler = (request: Request, ctx: FetchContext) => Response | Promise<Response>
  export type FetchHandlerWithAbortController = (request: Request, ctx: FetchContextWithAbortController) => Response | Promise<Response>

  export interface FetchRoute {
    (path: string, handler: FetchHandler): void
    (path: string, options: FetchRouteOptions & { abortController: true }, handler: FetchHandlerWithAbortController): void
    (path: string, options: FetchRouteOptions, handler: FetchHandler): void
  }

  export interface FetchRoutes {
    get: FetchRoute
    post: FetchRoute
    put: FetchRoute
    delete: FetchRoute
    patch: FetchRoute
    options: FetchRoute
    head: FetchRoute
  }

  export interface FastifyFetchOptions {
  }

  export const fastifyFetch: FastifyFetchPlugin

  export { fastifyFetch as default }
}

declare function fastifyFetch (...params: Parameters<FastifyFetchPlugin>): ReturnType<FastifyFetchPlugin>

export = fastifyFetch
