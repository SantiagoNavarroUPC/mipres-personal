import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const baseUrl = process.env.DUSAKAWI_API_URL
    const url = `${baseUrl}/api/afiliado/direccion`

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Error consultando direccion" }, { status: 500 })
  }
}
