import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/logo.png", request.url), 308)
}
