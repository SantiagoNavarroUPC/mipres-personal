import { NextRequest, NextResponse } from "next/server"
import { consultarJuntaProfesional } from "@/controllers/mipres-controller/junta-profesional-controller/junta-profesional.controller"

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams
    const nit = q.get("nit") || ""
    const tokenSubsidiado = q.get("tokenSubsidiado") || ""
    const tokenContributivo = q.get("tokenContributivo") || ""
    const noPrescripcion = q.get("noPrescripcion") || ""

    // Prefer raw tokens used by prescripciones: subsidiado -> contributivo
    const token = tokenSubsidiado || tokenContributivo

    if (!nit) return NextResponse.json({ success: false, error: "NIT es requerido" }, { status: 400 })
    if (!token) return NextResponse.json({ success: false, error: "Token (subsidiado|contributivo) es requerido" }, { status: 400 })
    if (!noPrescripcion) return NextResponse.json({ success: false, error: "noPrescripcion es requerido" }, { status: 400 })

    const result = await consultarJuntaProfesional(nit, token, noPrescripcion)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error interno del servidor", details: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 })
  }
}
