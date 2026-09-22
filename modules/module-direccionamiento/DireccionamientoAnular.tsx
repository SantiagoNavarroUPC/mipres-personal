"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Ban } from "lucide-react"

interface DireccionamientoAnularProps {
  idDireccionamiento: string
  loading: boolean
  onIdChange: (id: string) => void
  onAnular: () => void
}

export function DireccionamientoAnular({
  idDireccionamiento,
  loading,
  onIdChange,
  onAnular,
}: DireccionamientoAnularProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ban className="h-5 w-5" />
          Anular Direccionamiento
        </CardTitle>
        <CardDescription>Metodo para anular un direccionamiento</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="idDir">ID Direccionamiento</Label>
            <Input
              id="idDir"
              placeholder="123456"
              value={idDireccionamiento}
              onChange={(e) => onIdChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button variant="destructive" onClick={onAnular} disabled={loading}>
            <Ban className="h-4 w-4 mr-2" />
            {loading ? "Anulando..." : "Anular"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
