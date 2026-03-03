import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './Button';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear }) => {
  const sigCanvas = useRef<any>(null);

  const clear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      onClear();
    }
  };

  const save = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      // Use the raw canvas toDataURL to avoid trim-canvas dependency issues
      const canvas = sigCanvas.current.getCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            className: "w-full h-40 cursor-crosshair bg-white",
            style: { width: '100%', height: '160px' }
          }}
          onEnd={save}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
        >
          Padam Tandatangan
        </Button>
      </div>
    </div>
  );
};
