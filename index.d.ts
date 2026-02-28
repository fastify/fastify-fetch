import { FastifyPluginAsync, FastifyInstance, FastifyBaseLogger, FastifyRequest, FastifyReply } from 'fastify'

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
  }

  export type FetchHandler = (request: Request, ctx: FetchContext) => Response | Promise<Response>

  export interface FetchRoutes {
    get(path: string, handler: FetchHandler): void
    post(path: string, handler: FetchHandler): void
    put(path: string, handler: FetchHandler): void
    delete(path: string, handler: FetchHandler): void
    patch(path: string, handler: FetchHandler): void
    options(path: string, handler: FetchHandler): void
    head(path: string, handler: FetchHandler): void
  }

  export interface FastifyFetchOptions {
  }

  export const fastifyFetch: FastifyFetchPlugin

  export { fastifyFetch as default }
}

declare function fastifyFetch (...params: Parameters<FastifyFetchPlugin>): ReturnType<FastifyFetchPlugin>

export = fastifyFetch
