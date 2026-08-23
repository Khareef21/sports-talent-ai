import React, { useState } from 'react';
import AppIcon from '../ui/AppIcon';
import { API_BASE, parseApiError } from '../../lib/api';

const IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

function ImageInput({ label, file, onChange }) {
  return (
    <label className="kp-card-soft p-4 block cursor-pointer hover:border-[#74c9ff] transition">
      <span className="block text-xs text-[#a1afc7] font-bold uppercase tracking-wide mb-2">{label}</span>
      <span className="block text-sm text-white">{file ? file.name : 'Upload image'}</span>
      <span className="block text-xs text-[#7a8aa7] mt-1">JPG, PNG, or WebP</span>
      <input type="file" accept={IMAGE_TYPES} onChange={onChange} className="hidden" />
    </label>
  );
}

export default function LongJumpCalibration({ onComplete, onBack }) {
  const [groundImage, setGroundImage] = useState(null);
  const [referenceImage, setReferenceImage] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const validate = async (event) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (!groundImage || !referenceImage) {
      setError('Upload both calibration images before validating.');
      return;
    }
    const form = new FormData();
    form.append('ground_image', groundImage);
    form.append('reference_image', referenceImage);
    form.append('demo_mode', demoMode ? 'true' : 'false');
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/long-jump/calibrate`, { method: 'POST', body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const parsed = parseApiError(data, 'Calibration could not be validated.');
        throw new Error(parsed.message);
      }
      setResult(data.calibration);
    } catch (validationError) {
      setError(validationError.message);
    } finally {
      setBusy(false);
    }
  };

  if (result?.valid) {
    return (
      <div className="kp-card p-6 max-w-2xl mx-auto space-y-5">
        <div className="kp-kicker">Long Jump Calibration</div>
        <h2 className="text-2xl font-black text-white">Ground plane established</h2>
        <div className="grid gap-2 text-sm text-emerald-300">
          <p className="flex items-center gap-2"><AppIcon name="check" size={14} /> Ground geometry detected</p>
          <p className="flex items-center gap-2"><AppIcon name="check" size={14} /> Reference corners detected</p>
          <p className="flex items-center gap-2"><AppIcon name="check" size={14} /> Perspective calibrated</p>
          <p className="flex items-center gap-2"><AppIcon name="check" size={14} /> Ground plane established</p>
        </div>
        <div className="kp-card-soft p-4 flex justify-between items-center">
          <span className="text-sm text-[#a1afc7]">Calibration confidence</span>
          <strong className="text-xl text-emerald-400">{result.calibration_confidence}%</strong>
        </div>
        <p className="text-xs text-[#a1afc7]">Calibration confidence describes geometry quality. It is separate from measurement accuracy.</p>
        <button onClick={() => onComplete(result)} className="kp-button w-full py-3">Continue to Jump Video →</button>
        <button onClick={onBack} className="w-full text-sm text-[#7a8aa7] hover:text-white">Back</button>
      </div>
    );
  }

  return (
    <form onSubmit={validate} className="kp-card p-6 max-w-2xl mx-auto space-y-5">
      <button type="button" onClick={onBack} className="text-xs text-[#a1afc7] hover:text-white">← Back to Test Selection</button>
      <div>
        <div className="kp-kicker">Long Jump Calibration</div>
        <h2 className="text-2xl font-black text-white">Calibrate the actual runway and pit</h2>
        <p className="text-sm text-[#a1afc7] mt-2">Use two photos from the location. Do not use standard or assumed pitch dimensions.</p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-white">1. Ground Dimensions</h3>
        <p className="text-xs text-[#a1afc7]">Image 1 must show detectable ground boundaries or geometric features. Physical pitch dimensions are never invented.</p>
        <ImageInput label="Image A · Ground dimension image" file={groundImage} onChange={(event) => setGroundImage(event.target.files[0] || null)} />
        <p className="text-xs text-[#7a8aa7]">If metric information cannot be recovered, calibration is reported as CALIBRATION_UNCERTAIN.</p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-white">2. Pitch Reference Image</h3>
        <p className="text-xs text-[#a1afc7]">Place the standardized object flat beside the pitch, fully visible in Image 2. The camera may be angled.</p>
        <ImageInput label="Image B · Pitch reference image" file={referenceImage} onChange={(event) => setReferenceImage(event.target.files[0] || null)} />
        <p className="text-xs text-[#7a8aa7]">Centralized reference size: 1.00 m x 0.50 m. Do not enter pitch or marker dimensions.</p>
      </section>

      <label className="flex items-center gap-2 text-xs text-[#a1afc7]"><input type="checkbox" checked={demoMode} onChange={(event) => setDemoMode(event.target.checked)} className="accent-[#74c9ff]" /> Enable Demo Mode for development fixtures</label>

      {error && <div className="kp-status-danger rounded-xl p-3 text-sm">{error}</div>}
      <button type="submit" disabled={busy} className="kp-button w-full py-3 disabled:opacity-50">{busy ? 'Validating ground geometry…' : 'Validate Ground & Reference'}</button>
    </form>
  );
}
