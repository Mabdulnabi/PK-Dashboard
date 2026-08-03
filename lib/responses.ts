import { NextResponse } from 'next/server'

export const unauthorized = (msg = 'unauthorized') =>
  NextResponse.json({ error: msg }, { status: 401 })

export const forbidden = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 403 })

export const badRequest = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 400 })

export const notFound = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 404 })

export const serverError = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 500 })
