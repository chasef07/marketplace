'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { type AIAnalysisResult } from "@/lib/api-client-new"
import { useFileUpload } from "@/lib/hooks/useFileUpload"
import { Camera, Upload, X } from "lucide-react"
import Image from "next/image"

interface InteractiveUploadZoneProps {
  onShowListingPreview: (analysisData: AIAnalysisResult, uploadedImages: string[]) => void
}

export const InteractiveUploadZone = React.memo(function InteractiveUploadZone({ onShowListingPreview }: InteractiveUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const { uploadAndAnalyze, isAnalyzing, uploadProgress, progressMessage } = useFileUpload({ 
    onShowListingPreview, 
    showProgressSteps: true 
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('Please select image files only')
      return
    }

    setSelectedFiles(imageFiles)
  }, [])

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return
    await uploadAndAnalyze(selectedFiles)
  }, [selectedFiles, uploadAndAnalyze])

  const removeFile = useCallback((indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove))
  }, [])

  const clearFiles = useCallback(() => {
    setSelectedFiles([])
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
    // Reset the input so the same files can be selected again if needed
    if (e.target) {
      e.target.value = ''
    }
  }, [handleFiles])

  const handleClick = () => {
    if (isAnalyzing) return
    fileInputRef.current?.click()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div 
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${isDragging 
              ? 'border-primary bg-accent/50' 
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }
            ${isAnalyzing ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            id="hidden-file-input"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isAnalyzing ? (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto text-primary">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  AI Analyzing Your Furniture...
                </h3>
                <p className="text-sm text-slate-600 mb-4">{progressMessage}</p>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-slate-500 mt-2">{uploadProgress}% complete</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedFiles.length === 0 ? (
                <>
                  <div className="w-12 h-12 mx-auto text-slate-400">
                    <Camera className="w-full h-full" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      Drop photos here
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                      AI will analyze and create your listing
                    </p>
                    
                    <Button variant="outline" className="mb-4">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Files
                    </Button>
                    
                    <div className="flex justify-center space-x-4 text-xs text-slate-500">
                      <span>Instant Analysis</span>
                      <span>Smart Pricing</span>
                      <span>Complete Listings</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <p className="text-sm text-slate-600 mb-2">
                      {selectedFiles.length} image{selectedFiles.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                  
                  {/* Image Previews */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative aspect-square">
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          fill
                          className="object-cover rounded border"
                          sizes="80px"
                        />
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleUpload}
                      className="flex-1"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Analyze Images
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={clearFiles}
                      className="px-3"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})