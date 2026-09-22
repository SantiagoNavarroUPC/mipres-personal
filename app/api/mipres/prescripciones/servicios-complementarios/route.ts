import { NextRequest, NextResponse } from "next/server"
import { getRequiredEnv } from "../../../../../lib/env"

const DUSAKAWI_API_URL = getRequiredEnv("DUSAKAWI_API_URL").trim()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const codigo = searchParams.get("codigo")
    
    if (!codigo) {
      return NextResponse.json(
        { error: "codigo es requerido" },
        { status: 400 }
      )
    }
    
    const url = new URL(`${DUSAKAWI_API_URL}/api/mipres/servicios-complementarios`)
    url.searchParams.set("codigo", codigo)
    
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
      { error: "Error fetching servicios complementarios data" },
      { status: 500 }
    )
  }
}
