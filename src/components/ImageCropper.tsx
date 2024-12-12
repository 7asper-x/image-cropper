import React, { useState, useRef, useEffect } from "react";

interface ImageCropperProps {
  src: string;
  onChange?: (croppedImage: string) => void;
  aspectRatio?: number;
  maxSize?: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  src,
  onChange,
  aspectRatio = 1,
  maxSize = 500,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [zoom, setZoom] = useState(1);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleCrop = () => {
    if (imageRef.current) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (ctx) {
        const { width, height } = imageRef.current;
        const scaleX = width / imageRef.current.naturalWidth;
        const scaleY = height / imageRef.current.naturalHeight;

        const cropWidth = crop.width / scaleX;
        const cropHeight = crop.height / scaleY;

        canvas.width = cropWidth;
        canvas.height = cropHeight;

        ctx.drawImage(
          imageRef.current,
          crop.x / scaleX,
          crop.y / scaleY,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );

        const croppedImage = canvas.toDataURL("image/jpeg");

        if (onChange) {
          onChange(croppedImage);
        }
      }
    }
  };

  useEffect(() => {
    if (imageRef.current) {
      const { width } = imageRef.current;
      const newWidth = Math.min(width, maxSize);
      const newHeight = newWidth / aspectRatio;
      setCrop({ x: 0, y: 0, width: newWidth, height: newHeight });
    }
  }, [aspectRatio, maxSize, src]);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative overflow-hidden">
        <img
          ref={imageRef}
          src={src}
          alt="Crop"
          className="w-full h-auto object-contain"
        />
        <div
          className="absolute border-2 border-blue-500"
          style={{
            top: `${crop.y}px`,
            left: `${crop.x}px`,
            width: `${crop.width}px`,
            height: `${crop.height}px`,
          }}
        />
      </div>
      <div className="mt-4 flex space-x-2">
        <input
          type="range"
          min="1"
          max="3"
          step="0.1"
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="w-full"
        />
        <button
          onClick={handleCrop}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Crop
        </button>
      </div>
    </div>
  );
};

export default ImageCropper;
