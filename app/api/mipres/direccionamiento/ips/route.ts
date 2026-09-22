import { NextRequest, NextResponse } from "next/server"
import { getRequiredEnv } from "../../../../../lib/env"

const DUSAKAWI_API_URL = getRequiredEnv("DUSAKAWI_API_URL").trim()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    
    if (!search) {
      return NextResponse.json(
        { error: "search es requerido" },
        { status: 400 }
      )
    }
    
    const url = new URL(`${DUSAKAWI_API_URL}/api/mipres/ips`)
    url.searchParams.set("search", search)
    
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Error from API: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching IPS data" },
      { status: 500 }
    )
  }
}
