import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { getCroppedImg } from '../../utils/cropImage';

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide">{label}</span>
        <span className="text-ninja-navy font-ninja text-xs font-bold">{value}{label === 'Rotation' ? '°' : `×`}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-ninja-blue"
      />
    </div>
  );
}

export default function CropModal({ imageSrc, onConfirm, onCancel, aspect = 1, cropShape = 'round' }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onConfirm(blob);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
          style={{ maxHeight: '92dvh' }}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-ninja-border flex-shrink-0">
            <h3 className="font-ninja font-bold text-ninja-navy text-base">Adjust Photo</h3>
            <button onClick={onCancel} className="text-ninja-muted hover:text-ninja-navy transition-colors text-lg leading-none">✕</button>
          </div>

          {/* Crop area */}
          <div className="relative w-full bg-black flex-shrink-0 overflow-hidden" style={{ height: 260 }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Controls */}
          <div
            className="px-5 pt-4 space-y-4 overflow-y-auto flex-shrink-0"
            style={{ paddingBottom: 'max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))' }}
          >
            <Slider label="Zoom" value={zoom} min={1} max={3} step={0.05} onChange={setZoom} />
            <Slider label="Rotation" value={rotation} min={-180} max={180} step={1} onChange={setRotation} />

            <div className="flex gap-2 pt-1">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl border border-ninja-border text-ninja-navy font-ninja font-semibold text-sm hover:bg-ninja-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl bg-ninja-blue text-white font-ninja font-bold text-sm hover:bg-ninja-blue-hover transition-colors disabled:opacity-60"
              >
                {processing ? 'Saving…' : 'Save Photo'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
