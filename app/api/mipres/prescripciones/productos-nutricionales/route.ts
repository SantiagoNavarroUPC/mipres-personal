import { NextRequest, NextResponse } from "next/server"
import { getRequiredEnv } from "../../../../../lib/env"

const MIPRES_API_URL = getRequiredEnv("MIPRES_API_URL").trim()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const codigoMipres = searchParams.get("codigo_mipres")
    
    if (!codigoMipres) {
      return NextResponse.json(
        { error: "codigo_mipres es requerido" },
        { status: 400 }
      )
    }
    
    const url = new URL(`${MIPRES_API_URL}/api/mipres/productos-nutricionales`)
    url.searchParams.set("codigo_mipres", codigoMipres)
    
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
      { error: "Error fetching productos nutricionales data" },
      { status: 500 }
    )
  }
}
