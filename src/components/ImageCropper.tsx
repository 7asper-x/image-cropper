import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface ImageCropperProps {
  src: string;
  onChange?: (croppedImage: string) => void;
  aspectRatio?: number;
}

interface FrameCoords {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  src,
  onChange,
  aspectRatio = 1,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [frame, setFrame] = useState<FrameCoords>({
    tx: 0,
    ty: 0,
    sx: 300,
    sy: 300,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      // Calculate size to maintain aspect ratio
      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect) return;

      const containerSize = Math.min(stageRect.width, stageRect.height);
      const imgAspectRatio = img.width / img.height;

      let canvasWidth, canvasHeight;
      if (imgAspectRatio > 1) {
        canvasWidth = containerSize;
        canvasHeight = containerSize / imgAspectRatio;
      } else {
        canvasHeight = containerSize;
        canvasWidth = containerSize * imgAspectRatio;
      }

      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // Get canvas position after it's rendered
      const canvasRect = canvas.getBoundingClientRect();
      const canvasOffset = {
        x: canvasRect.left - stageRect.left,
        y: canvasRect.top - stageRect.top,
      };

      // Initialize crop frame
      const initialSize = Math.min(canvasWidth, canvasHeight) * 0.5;
      const frameWidth = initialSize;
      const frameHeight = aspectRatio ? frameWidth / aspectRatio : initialSize;

      // Center the frame relative to the canvas position
      setFrame({
        tx: canvasOffset.x + (canvasWidth - frameWidth) / 2,
        ty: canvasOffset.y + (canvasHeight - frameHeight) / 2,
        sx: frameWidth,
        sy: frameHeight,
      });

      setIsLoaded(true);
    };
  }, [src, aspectRatio]);

  // Handle rotation updates
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const img = new Image();
    img.src = src;

    img.onload = () => {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate new dimensions for rotated image
      const radians = (rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));

      // Get original image dimensions
      const imgWidth = img.width;
      const imgHeight = img.height;

      // Calculate new canvas dimensions to fit rotated image
      const newWidth = imgWidth * cos + imgHeight * sin;
      const newHeight = imgWidth * sin + imgHeight * cos;

      // Set canvas size to new dimensions
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Move to center and rotate
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);

      // Draw image centered
      ctx.drawImage(img, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);

      // Reset transformation
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
  }, [rotation, src]);

  const handleMouseDown = (e: React.MouseEvent, direction?: string) => {
    if (!stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    setIsDragging(true);
    setActiveHandle(direction || "move");
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    setFrame((prev) => {
      const newFrame = { ...prev };

      if (activeHandle === "move") {
        newFrame.tx = Math.max(
          0,
          Math.min(prev.tx + deltaX, rect.width - prev.sx)
        );
        newFrame.ty = Math.max(
          0,
          Math.min(prev.ty + deltaY, rect.height - prev.sy)
        );
      } else {
        if (activeHandle?.includes("r")) {
          newFrame.sx = Math.max(
            100,
            Math.min(x - prev.tx, rect.width - prev.tx)
          );
        }
        if (activeHandle?.includes("l")) {
          const maxLeft = prev.tx + prev.sx - 100;
          const newLeft = Math.max(0, Math.min(x, maxLeft));
          newFrame.sx = prev.sx + (prev.tx - newLeft);
          newFrame.tx = newLeft;
        }
        if (activeHandle?.includes("b")) {
          newFrame.sy = Math.max(
            100,
            Math.min(y - prev.ty, rect.height - prev.ty)
          );
        }
        if (activeHandle?.includes("t")) {
          const maxTop = prev.ty + prev.sy - 100;
          const newTop = Math.max(0, Math.min(y, maxTop));
          newFrame.sy = prev.sy + (prev.ty - newTop);
          newFrame.ty = newTop;
        }

        if (aspectRatio) {
          if (activeHandle?.includes("r") || activeHandle?.includes("l")) {
            newFrame.sy = newFrame.sx / aspectRatio;
          } else {
            newFrame.sx = newFrame.sy * aspectRatio;
          }
        }
      }

      return newFrame;
    });

    setDragStart({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActiveHandle(null);
  };

  const handleCrop = () => {
    if (!canvasRef.current || !stageRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sourceCanvas = canvasRef.current;
    const stageRect = stageRef.current.getBoundingClientRect();
    const canvasRect = sourceCanvas.getBoundingClientRect();

    // Calculate the offset of canvas relative to the stage container
    const canvasOffset = {
      x: canvasRect.left - stageRect.left,
      y: canvasRect.top - stageRect.top,
    };

    // Calculate the scale factor between displayed size and actual size
    const scale = sourceCanvas.width / canvasRect.width;

    // Adjust crop coordinates by subtracting the canvas offset
    const adjustedCrop = {
      x: (frame.tx - canvasOffset.x) * scale,
      y: (frame.ty - canvasOffset.y) * scale,
      width: frame.sx * scale,
      height: frame.sy * scale,
    };

    // Set output dimensions
    canvas.width = adjustedCrop.width;
    canvas.height = adjustedCrop.height;

    // Draw the cropped area
    ctx.drawImage(
      sourceCanvas,
      adjustedCrop.x,
      adjustedCrop.y,
      adjustedCrop.width,
      adjustedCrop.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL("image/jpeg", 1.0);
  };

  return (
    <div className="flex flex-col w-full h-full gap-4 p-4 rounded-lg bg-background">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            size="icon"
            onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
          >
            ↶
          </Button>
          <Button
            size="icon"
            onClick={() => setRotation((r) => (r + 90) % 360)}
          >
            ↷
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {Math.round(frame.sx)} × {Math.round(frame.sy)}
          </span>
          <Button
            onClick={() => {
              const croppedImage = handleCrop();
              if (croppedImage && onChange) {
                onChange(croppedImage);
              }
            }}
          >
            Done
          </Button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="relative w-full overflow-hidden aspect-square"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="relative flex items-center justify-center w-full h-full">
          <canvas
            ref={canvasRef}
            className="object-contain max-w-full max-h-full"
            style={{
              transformOrigin: "center center",
            }}
          />
        </div>
        {isLoaded && (
          <div className="absolute inset-0">
            {/* Dark overlay outside crop area */}
            <div
              className="absolute inset-0"
              style={{
                top: frame.ty,
                left: frame.tx,
                width: frame.sx,
                height: frame.sy,
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
              }}
            />

            {/* Crop Frame */}
            <div
              className="absolute border-2 border-white"
              style={{
                top: frame.ty,
                left: frame.tx,
                width: frame.sx,
                height: frame.sy,
                cursor: isDragging ? "grabbing" : "grab",
              }}
              onMouseDown={(e) => handleMouseDown(e, "move")}
            >
              {/* Corner handles */}
              {["tl", "tr", "bl", "br"].map((corner) => (
                <div
                  key={corner}
                  className="absolute w-5 h-5 bg-white border-2 rounded-full border-black/25"
                  style={{
                    top: corner.includes("t") ? -8 : "auto",
                    bottom: corner.includes("b") ? -8 : "auto",
                    left: corner.includes("l") ? -8 : "auto",
                    right: corner.includes("r") ? -8 : "auto",
                    cursor:
                      corner === "tl" || corner === "br"
                        ? "nwse-resize"
                        : "nesw-resize",
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, corner);
                  }}
                />
              ))}

              {/* Edge handles */}
              {["t", "r", "b", "l"].map((edge) => (
                <div
                  key={edge}
                  className="absolute bg-white"
                  style={{
                    top: edge === "t" ? -1 : edge === "b" ? "auto" : "50%",
                    bottom: edge === "b" ? -1 : "auto",
                    left: edge === "l" ? -1 : edge === "r" ? "auto" : "50%",
                    right: edge === "r" ? -1 : "auto",
                    width: ["l", "r"].includes(edge) ? 2 : "100%",
                    height: ["t", "b"].includes(edge) ? 2 : "100%",
                    transform: ["l", "r"].includes(edge)
                      ? "translateY(-50%)"
                      : "translateX(-50%)",
                    cursor: `${edge}-resize`,
                    pointerEvents: "all",
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, edge);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Rotation {rotation}°</label>
        <Slider
          value={[rotation]}
          onValueChange={([value]) => setRotation(value)}
          min={0}
          max={360}
          step={1}
        />
      </div>
    </div>
  );
};

export default ImageCropper;
