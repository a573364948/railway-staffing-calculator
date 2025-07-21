"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  error?: string
}

export function FileUpload({ onFileSelect, selectedFile, error }: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  })

  return (
    <div className="space-y-4">
      <Card className="bg-theme-surface border-theme">
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? "border-theme-secondary bg-theme-accent"
                : "border-theme hover:border-theme-secondary hover:bg-theme-accent/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-theme-muted mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium text-theme-secondary">拖放文件至此...</p>
            ) : (
              <div>
                <p className="text-lg font-medium text-theme-primary mb-2">选择Excel文件或拖放至此</p>
                <p className="text-sm text-theme-muted">支持 .xlsx 和 .xls 格式</p>
                <Button
                  className="mt-4"
                  variant="outline"
                >
                  选择文件
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedFile && (
        <Card className="bg-theme-background border-theme">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-theme-secondary" />
              <div>
                <p className="font-medium text-theme-primary">{selectedFile.name}</p>
                <p className="text-sm text-theme-muted">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
