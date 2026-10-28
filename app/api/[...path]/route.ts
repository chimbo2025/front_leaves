import { NextResponse, type NextRequest } from 'next/server'

const API_BASE = process.env.API_BASE ?? 'https://back-leaves.wasmer.dev'
/**
 * Pass-through proxy for /api/* → Laravel backend.
 * The Turbopack `rewrites` config was unreliable here, so this route handler
 * forwards every /api method (including multipart uploads) to the backend.
 */
async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const url = `${API_BASE}/api/${path.join('/')}${req.nextUrl.search}`

  const headers = new Headers(req.headers)
  headers.delete('host')
  headers.delete('accept-encoding')
  headers.delete('expect')
  headers.delete('transfer-encoding')
  headers.delete('connection')
  headers.set('accept', 'application/json')

  const init: RequestInit = { method: req.method, headers, redirect: 'manual' }

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    const buf = await req.arrayBuffer()
    init.body = buf.byteLength > 0 ? buf : null
  }

  const upstream = await fetch(url, init)
  const body = await upstream.arrayBuffer()

  const res = new NextResponse(Buffer.from(body), {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
  })
  return res
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const HEAD = proxy
export const OPTIONS = proxy