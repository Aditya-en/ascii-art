"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, Download, Copy, Settings, ImageIcon, Palette, Lock, Unlock, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useTheme } from "next-themes"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

// ASCII character sets ordered from DARKEST to LIGHTEST for consistent mapping
const ASCII_SETS = {
  minimal: "@%#*+=-:. ",
  simple: "@#S%?*+;:,. ",
  detailed: "█▉▊▋▌▍▎▏▎▍▌▋▊▉█■▪▫▬▭▮▯▰▱@#S%?*+;:,. ",
  blocks: "█▓▒░ ",
  comprehensive: "██▓▒░@#%&*+=<>?/\\|}{[]()^~`\"';:,._-    ",
}

type DetailLevel = keyof typeof ASCII_SETS

export default function AsciiArtGenerator() {
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null)
  const [imageUrl, setImageUrl] = useState<string>("")
  const [asciiArt, setAsciiArt] = useState<string>("")
  const [isConverting, setIsConverting] = useState(false)
  const [widthInput, setWidthInput] = useState("200")
  const [heightInput, setHeightInput] = useState("200")
  const [width, setWidth] = useState(200)
  const [height, setHeight] = useState(200)
  const [detailLevel, setDetailLevel] = useState<DetailLevel>("simple")
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true)
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [asciiColor, setAsciiColor] = useState("green")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle aspect ratio changes
  const updateDimensions = useCallback(
    (newWidth: number, newHeight: number, maintainRatio = false) => {
      if (aspectRatioLocked && aspectRatio && maintainRatio) {
        if (newWidth !== width) {
          const calculatedHeight = Math.round(newWidth / aspectRatio)
          setWidth(newWidth)
          setHeight(calculatedHeight)
          setWidthInput(newWidth.toString())
          setHeightInput(calculatedHeight.toString())
        } else if (newHeight !== height) {
          const calculatedWidth = Math.round(newHeight * aspectRatio)
          setWidth(calculatedWidth)
          setHeight(newHeight)
          setWidthInput(calculatedWidth.toString())
          setHeightInput(newHeight.toString())
        }
      } else {
        setWidth(newWidth)
        setHeight(newHeight)
        setWidthInput(newWidth.toString())
        setHeightInput(newHeight.toString())
      }
    },
    [aspectRatioLocked, aspectRatio, width, height],
  )

  const handleWidthChange = useCallback((value: string) => {
    setWidthInput(value)
  }, [])

  const handleHeightChange = useCallback((value: string) => {
    setHeightInput(value)
  }, [])

  const handleWidthBlur = useCallback(() => {
    const numValue = Number.parseInt(widthInput) || 200
    const clampedValue = Math.max(10, Math.min(200, numValue))
    updateDimensions(clampedValue, height, true)
  }, [widthInput, height, updateDimensions])

  const handleHeightBlur = useCallback(() => {
    const numValue = Number.parseInt(heightInput) || 200
    const clampedValue = Math.max(10, Math.min(200, numValue))
    updateDimensions(width, clampedValue, true)
  }, [heightInput, width, updateDimensions])

  // Handle file upload
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          setUploadedImage(img)
          setImageUrl(e.target?.result as string)

          // Calculate aspect ratio
          const ratio = img.width / img.height
          setAspectRatio(ratio)

          // Adjust height to maintain aspect ratio if locked
          if (aspectRatioLocked) {
            const newHeight = Math.round(width / ratio)
            setHeight(newHeight)
            setHeightInput(newHeight.toString())
          }
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    },
    [width, aspectRatioLocked],
  )

  // Convert image to ASCII
  const convertToAscii = useCallback(async () => {
    if (!uploadedImage) return

    setIsConverting(true)

    setTimeout(() => {
      try {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        canvas.width = uploadedImage.width
        canvas.height = uploadedImage.height
        ctx.drawImage(uploadedImage, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        const patchWidth = canvas.width / width
        const patchHeight = canvas.height / height
        const chars = ASCII_SETS[detailLevel]

        let result = ""

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const startX = Math.floor(x * patchWidth)
            const endX = Math.min(Math.floor((x + 1) * patchWidth), canvas.width)
            const startY = Math.floor(y * patchHeight)
            const endY = Math.min(Math.floor((y + 1) * patchHeight), canvas.height)

            let totalGrayscale = 0
            let pixelCount = 0

            for (let py = startY; py < endY; py++) {
              for (let px = startX; px < endX; px++) {
                const index = (py * canvas.width + px) * 4
                const r = data[index]
                const g = data[index + 1]
                const b = data[index + 2]

                // Apply grayscale formula: 0.299×R + 0.587×G + 0.114×B
                const grayscale = 0.299 * r + 0.587 * g + 0.114 * b
                totalGrayscale += grayscale
                pixelCount++
              }
            }

            const avgGrayscale = totalGrayscale / pixelCount

            // FIXED MAPPING: Brighter pixels (higher grayscale) = Brighter characters (later in array)
            // Normalize grayscale (0-255) to character index (0 to chars.length-1)
            const charIndex = Math.floor((avgGrayscale / 255) * (chars.length - 1))
            const asciiChar = chars[charIndex] // NO REVERSAL - direct mapping

            result += asciiChar
          }
          result += "\n"
        }

        setAsciiArt(result)
      } catch (error) {
        console.error("Error converting to ASCII:", error)
      } finally {
        setIsConverting(false)
      }
    }, 100)
  }, [uploadedImage, width, height, detailLevel])

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(asciiArt)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }, [asciiArt])

  // Download as text file
  const downloadAscii = useCallback(() => {
    const blob = new Blob([asciiArt], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "ascii-art.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [asciiArt])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              ASCII Art
            </h1>
          </div>
          <Button variant="outline" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-4">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload & Settings
                </CardTitle>
                <CardDescription>Upload an image and configure your ASCII art settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Image Upload */}
                <div className="space-y-4">
                  <div
                    className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imageUrl ? (
                      <div className="space-y-3">
                        <div className="relative w-full h-32 overflow-hidden rounded-md">
                          <img
                            src={imageUrl || "/placeholder.svg"}
                            alt="Uploaded"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">Click to change image</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground" />
                        <div>
                          <p className="font-medium">Click to upload image</p>
                          <p className="text-sm text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <Separator />

                {/* Settings */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </h3>

                  {/* Detail Level */}
                  <div className="space-y-2">
                    <Label>Detail Level</Label>
                    <Select value={detailLevel} onValueChange={(value: DetailLevel) => setDetailLevel(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                        <SelectItem value="blocks">Blocks</SelectItem>
                        <SelectItem value="comprehensive">Comprehensive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dimensions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Dimensions</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                        className="h-8 w-8 p-0"
                      >
                        {aspectRatioLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Width</Label>
                        <Input
                          type="number"
                          value={widthInput}
                          onChange={(e) => handleWidthChange(e.target.value)}
                          onBlur={handleWidthBlur}
                          min="10"
                          max="200"
                          className="mt-1"
                          placeholder="200"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Height</Label>
                        <Input
                          type="number"
                          value={heightInput}
                          onChange={(e) => handleHeightChange(e.target.value)}
                          onBlur={handleHeightBlur}
                          min="10"
                          max="200"
                          className="mt-1"
                          placeholder="200"
                        />
                      </div>
                    </div>

                    {aspectRatio && (
                      <p className="text-sm text-muted-foreground">Aspect ratio: {aspectRatio.toFixed(2)}:1</p>
                    )}
                  </div>

                  {/* ASCII Color */}
                  <div className="space-y-2">
                    <Label>ASCII Art Color</Label>
                    <Select value={asciiColor} onValueChange={setAsciiColor}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="green">Matrix Green</SelectItem>
                        <SelectItem value="blue">Cyber Blue</SelectItem>
                        <SelectItem value="purple">Neon Purple</SelectItem>
                        <SelectItem value="orange">Retro Orange</SelectItem>
                        <SelectItem value="red">Terminal Red</SelectItem>
                        <SelectItem value="white">Classic White</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Generate Button */}
                <Button onClick={convertToAscii} disabled={!uploadedImage || isConverting} className="w-full" size="lg">
                  {isConverting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <Palette className="w-4 h-4 mr-2" />
                      Generate ASCII Art
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Output */}
          <div className="lg:col-span-8">
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      ASCII Art Output
                    </CardTitle>
                    <CardDescription>Your generated ASCII art will appear here</CardDescription>
                  </div>
                  {asciiArt && (
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        {width} × {height}
                      </Badge>
                      <Badge variant="secondary">{detailLevel}</Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {asciiArt ? (
                  <div className="space-y-4">
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button onClick={copyToClipboard} variant="outline" size="sm" className="flex-1 bg-transparent">
                        <Copy className="w-4 h-4 mr-2" />
                        {copySuccess ? "Copied!" : "Copy"}
                      </Button>
                      <Button onClick={downloadAscii} variant="outline" size="sm" className="flex-1 bg-transparent">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>

                    {/* ASCII Output */}
                    <div className="relative">
                      <Textarea
                        value={asciiArt}
                        readOnly
                        className={`font-mono text-xs leading-tight resize-none min-h-[650px] max-h-[70vh] overflow-auto bg-black border-2 ${
                          asciiColor === "green"
                            ? "text-green-400 border-green-800"
                            : asciiColor === "blue"
                              ? "text-blue-400 border-blue-800"
                              : asciiColor === "purple"
                                ? "text-purple-400 border-purple-800"
                                : asciiColor === "orange"
                                  ? "text-orange-400 border-orange-800"
                                  : asciiColor === "red"
                                    ? "text-red-400 border-red-800"
                                    : "text-white border-gray-600"
                        }`}
                        style={{
                          fontSize: `${Math.max(6, Math.min(10, 600 / width))}px`,
                          fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
                          lineHeight: "1.1",
                          letterSpacing: "0.5px",
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
                    <div className="text-center space-y-3">
                      <Palette className="w-16 h-16 mx-auto opacity-50" />
                      <div>
                        <p className="text-lg font-medium">No ASCII art yet</p>
                        <p className="text-sm">Upload an image and click "Generate ASCII Art" to get started</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
