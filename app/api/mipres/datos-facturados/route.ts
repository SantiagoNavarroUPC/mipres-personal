import { NextRequest, NextResponse } from "next/server"
import { fetchDatosFacturadosPorPrescripcion } from "@/requests/mipres-sispro/facturacion.request"
import { registrarDatosFacturado, anularDatosFacturado } from "@/controllers/mipres-controller/facturacion-controller/facturacion.controller"
import type { MipresCredentials } from "@/models/credentials.model"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nit = searchParams.get("nit")
    const tokenAcceso = searchParams.get("tokenAcceso")
    const tokenAccesoSubsidiado = searchParams.get("tokenAccesoSubsidiado")
    const tokenAccesoContributivo = searchParams.get("tokenAccesoContributivo")
    const noPrescripcion = searchParams.get("noPrescripcion")

    if (!nit) {
      return NextResponse.json({ success: false, error: "NIT es requerido" }, { status: 400 })
    }

    const token = tokenAcceso || tokenAccesoSubsidiado || tokenAccesoContributivo
    if (!token) {
      return NextResponse.json({ success: false, error: "Token de acceso es requerido" }, { status: 400 })
    }

    if (!noPrescripcion) {
      return NextResponse.json({ success: false, error: "noPrescripcion es requerida" }, { status: 400 })
    }

    const result = await fetchDatosFacturadosPorPrescripcion(nit, token, noPrescripcion)

    if (result.success && result.data) {
      const data: any[] = Array.isArray(result.data) ? result.data : [result.data]
      const activos = data.filter((d) => d.IDDatosFacturado && d.EstDatosFacturado !== 0)
      const keys: string[] = activos.map((d) => `${d.NoPrescripcion}-${d.ConTec}-${d.NoEntrega}`)
      const idsByKey: Record<string, number> = {}
      for (const d of activos) {
        idsByKey[`${d.NoPrescripcion}-${d.ConTec}-${d.NoEntrega}`] = d.IDDatosFacturado
      }
      return NextResponse.json({ success: true, data, keys, idsByKey, total: data.length })
    }

    return NextResponse.json({ success: true, data: [], keys: [], idsByKey: {}, total: 0 })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nit = searchParams.get("nit")
    const token =
      searchParams.get("tokenAcceso") ||
      searchParams.get("tokenAccesoSubsidiado") ||
      searchParams.get("tokenAccesoContributivo")

    if (!nit) {
      return NextResponse.json({ success: false, error: "NIT es requerido" }, { status: 400 })
    }
    if (!token) {
      return NextResponse.json({ success: false, error: "Token de acceso es requerido" }, { status: 400 })
    }

    const body = await request.json()
    const id = body?.ID

    if (typeof id !== "number" || !Number.isFinite(id)) {
      return NextResponse.json({ success: false, error: "ID es requerido y debe ser un número" }, { status: 400 })
    }

    const credentials: MipresCredentials = { nit, tokenAcceso: token }
    const result = await registrarDatosFacturado(credentials, id)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nit = searchParams.get("nit")
    const token =
      searchParams.get("tokenAcceso") ||
      searchParams.get("tokenAccesoSubsidiado") ||
      searchParams.get("tokenAccesoContributivo")

    if (!nit) {
      return NextResponse.json({ success: false, error: "NIT es requerido" }, { status: 400 })
    }
    if (!token) {
      return NextResponse.json({ success: false, error: "Token de acceso es requerido" }, { status: 400 })
    }

    const body = await request.json()
    const idDatosFacturado = body?.IDDatosFacturado

    if (typeof idDatosFacturado !== "number" || !Number.isFinite(idDatosFacturado)) {
      return NextResponse.json({ success: false, error: "IDDatosFacturado es requerido y debe ser un número" }, { status: 400 })
    }

    const credentials: MipresCredentials = { nit, tokenAcceso: token }
    const result = await anularDatosFacturado(credentials, idDatosFacturado)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}
