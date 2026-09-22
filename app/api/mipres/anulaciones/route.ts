import { NextRequest, NextResponse } from "next/server"

// URL base de la API MIPRES NO PBS/UPC
const BASE_URL = process.env.BASE_URL

export async function POST(request: NextRequest) {
  try {
    const { nit, token, tipo, params, IdDireccionamiento } = await request.json()

    if (!nit || !token) {
      return NextResponse.json(
        { success: false, error: "NIT y Token son requeridos" },
        { status: 400 }
      )
    }

    let url = ""
    let method = "PUT" // Por defecto PUT para anulaciones

    switch (tipo) {
      case "prescripcion":
        // PUT api/AnulacionXPrescripcion/{nit}/{token}/{numeroPrescripcion}
        url = `${BASE_URL}/AnulacionXPrescripcion/${nit}/${token}/${params.numeroPrescripcion}`
        break
      case "direccionamiento":
        // PUT api/AnularDireccionamiento/{nit}/{token}/{IdDireccionamiento}
        url = `${BASE_URL}/AnularDireccionamiento/${nit}/${token}/${IdDireccionamiento}`
        break
      default:
        return NextResponse.json(
          { success: false, error: "Tipo de consulta no válido" },
          { status: 400 }
        )
    }

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        success: true,
        data: data,
      })
    } else {
      const errorText = await response.text()
      let errorMessage = `Error: ${response.status}`
      let parsedError = null

      try {
        parsedError = JSON.parse(errorText)
        if (parsedError.Errors && Array.isArray(parsedError.Errors) && parsedError.Errors.length > 0) {
          errorMessage = parsedError.Errors[0]
        } else if (typeof parsedError.Errors === "string") {
          errorMessage = parsedError.Errors
        } else if (parsedError.Message) {
          errorMessage = parsedError.Message
        }
      } catch (e) {
        // No es JSON válido, usar el texto si no es muy largo (ej. HTML de error)
        if (errorText && errorText.length < 200) errorMessage = errorText
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: parsedError || errorText,
        Errors: parsedError?.Errors
      }, { status: response.status })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error de conexión",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}
