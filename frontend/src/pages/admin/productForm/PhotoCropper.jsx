import { useRef, useState } from 'react';
import { canvasToImage } from '../../../imageResizing.js';
import { Icon } from '../../../Icon.jsx';

const outputSize = 1000;
const maximumZoom = 4;

// zoom 1 = the whole photo fits the square (the default, so nothing is cut off).
// offset: how far the photo is moved, as a share of the square's width.
// The photo may not be dragged past the square's edge once it is bigger than the square.
function clampOffset(offset, zoom, fitted) {
  const room = (size) => Math.max(0, (size * zoom - 1) / 2);
  const clamp = (value, limit) => Math.min(limit, Math.max(-limit, value));
  return { x: clamp(offset.x, room(fitted.width)), y: clamp(offset.y, room(fitted.height)) };
}

// The photo's width and height as a share of the square at zoom 1.
function fittedSizeOf(image) {
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  return { width: image.naturalWidth / longest, height: image.naturalHeight / longest };
}

// Draws what the square shows onto a white 1000 × 1000 picture.
async function cropToImage(image, { zoom, offset }) {
  const fitted = fittedSizeOf(image);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, outputSize, outputSize);
  const width = fitted.width * zoom * outputSize;
  const height = fitted.height * zoom * outputSize;
  context.drawImage(image, (outputSize - width) / 2 + offset.x * outputSize, (outputSize - height) / 2 + offset.y * outputSize, width, height);
  return canvasToImage(canvas);
}

// Drag the photo inside the square; the guide lines show only while dragging.
function useCropDrag(crop, setCrop, fitted) {
  const dragStart = useRef(null);
  const [dragging, setDragging] = useState(false);
  function stopDragging() {
    dragStart.current = null;
    setDragging(false);
  }
  const handlers = {
    onPointerDown(event) {
      if (!fitted) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragStart.current = { x: event.clientX, y: event.clientY, offset: crop.offset };
      setDragging(true);
    },
    onPointerMove(event) {
      if (!dragStart.current) return;
      const squareWidth = event.currentTarget.clientWidth;
      const start = dragStart.current;
      const offset = { x: start.offset.x + (event.clientX - start.x) / squareWidth, y: start.offset.y + (event.clientY - start.y) / squareWidth };
      setCrop({ ...crop, offset: clampOffset(offset, crop.zoom, fitted) });
    },
    onPointerUp: stopDragging,
    onPointerCancel: stopDragging,
  };
  return { dragging, handlers };
}

function useZoom(crop, setCrop, fitted) {
  const coverZoom = fitted ? 1 / Math.min(fitted.width, fitted.height) : 1;
  const zoomTo = (zoom) => {
    const limited = Math.min(maximumZoom, Math.max(1, zoom));
    setCrop({ zoom: limited, offset: clampOffset(crop.offset, limited, fitted) });
  };
  return { coverZoom, zoomTo };
}

function CropHeader({ crop, fitted, zoom, step }) {
  const isFill = Boolean(fitted) && Math.abs(crop.zoom - zoom.coverZoom) < 0.005;
  return (
    <div className="crop-header">
      {step ? <QueueSteps step={step} /> : <span>Crop to square</span>}
      <div className="segmented crop-modes" role="group" aria-label="Photo size">
        <button type="button" aria-pressed={crop.zoom === 1} disabled={!fitted} onClick={() => zoom.zoomTo(1)}>Fit</button>
        <button type="button" aria-pressed={isFill} disabled={!fitted || zoom.coverZoom === 1} onClick={() => zoom.zoomTo(zoom.coverZoom)}>Fill</button>
      </div>
    </div>
  );
}

// "Photo 2 of 3" as a short bar per photo: done, this one, still to come.
function QueueSteps({ step }) {
  return (
    <span className="crop-steps" aria-label={`Photo ${step.number} of ${step.total}`}>
      {Array.from({ length: step.total }, (unused, index) => (
        <i key={index} className={index + 1 < step.number ? 'crop-step-done' : index + 1 === step.number ? 'crop-step-now' : undefined} />
      ))}
    </span>
  );
}

function ZoomRow({ crop, fitted, zoom }) {
  const filledPercent = ((crop.zoom - 1) / (maximumZoom - 1)) * 100;
  return (
    <div className="crop-zoom">
      <button type="button" className="icon-button" disabled={!fitted || crop.zoom <= 1} onClick={() => zoom.zoomTo(crop.zoom - 0.25)} aria-label="Zoom out"><Icon name="minus" size={16} /></button>
      <input type="range" min="1" max={maximumZoom} step="0.01" value={crop.zoom} disabled={!fitted} style={{ '--filled': `${filledPercent}%` }}
        onChange={(event) => zoom.zoomTo(Number(event.target.value))} aria-label="Zoom" />
      <button type="button" className="icon-button" disabled={!fitted || crop.zoom >= maximumZoom} onClick={() => zoom.zoomTo(crop.zoom + 0.25)} aria-label="Zoom in"><Icon name="plus" size={16} /></button>
      <span className="crop-zoom-value">{Math.round(crop.zoom * 100)}%</span>
    </div>
  );
}

function CropStage({ sourceUrl, imageRef, fitted, crop, drag, onLoad, onError }) {
  const imageStyle = fitted ? {
    width: `${fitted.width * crop.zoom * 100}%`, height: `${fitted.height * crop.zoom * 100}%`,
    transform: `translate(calc(-50% + ${crop.offset.x * 100}cqw), calc(-50% + ${crop.offset.y * 100}cqw))`,
  } : { opacity: 0 };
  return (
    <div className={`crop-square${drag.dragging ? ' crop-dragging' : ''}`} {...drag.handlers}>
      <img ref={imageRef} src={sourceUrl} alt="" crossOrigin="anonymous" draggable={false} style={imageStyle} onLoad={onLoad} onError={onError} />
      <span className="crop-grid" aria-hidden="true" />
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => <span key={corner} className={`crop-corner crop-corner-${corner}`} aria-hidden="true" />)}
      {!fitted && <span className="spinner spinner-dark crop-loading" aria-hidden="true" />}
    </div>
  );
}

const wholePhoto = { zoom: 1, offset: { x: 0, y: 0 } };

function CropActions({ step, saving, canSave, onCancel, onSkip, onSave }) {
  const many = step?.total > 1;
  return (
    <div className="crop-actions">
      {many && <button type="button" className="text-button crop-skip" onClick={onSkip} disabled={!canSave || saving}>Skip</button>}
      <button type="button" className="button button-outline button-compact" onClick={onCancel} disabled={saving}>{many ? 'Cancel all' : 'Cancel'}</button>
      <button type="button" className="button button-compact" onClick={onSave} disabled={!canSave || saving}>
        {saving ? <><span className="spinner" aria-hidden="true" /> Saving…</> : <><Icon name="check" size={16} /> {step && step.number < step.total ? 'Use & next' : 'Use photo'}</>}
      </button>
    </div>
  );
}

// Square crop in the photo panel. sourceUrl: the chosen file or the saved photo.
// onDone(image) gets the cropped picture, ready to upload. step: { number, total } when
// several photos are cropped one after another; Skip then keeps the whole photo on white.
export function PhotoCropper({ sourceUrl, step, onCancel, onDone }) {
  const imageRef = useRef(null);
  const [fitted, setFitted] = useState(null);
  const [crop, setCrop] = useState({ zoom: 1, offset: { x: 0, y: 0 } });
  const [state, setState] = useState({ saving: false, error: null });
  const drag = useCropDrag(crop, setCrop, fitted);
  const zoom = useZoom(crop, setCrop, fitted);
  async function savePhoto(chosenCrop = crop) {
    setState({ saving: true, error: null });
    try {
      await onDone(await cropToImage(imageRef.current, chosenCrop));
    } catch (error) {
      setState({ saving: false, error: error.message ?? 'This photo could not be cropped. Choose it again.' });
    }
  }
  return (
    <div className="photo-cropper">
      <CropHeader crop={crop} fitted={fitted} zoom={zoom} step={step} />
      <CropStage sourceUrl={sourceUrl} imageRef={imageRef} fitted={fitted} crop={crop} drag={drag}
        onLoad={(event) => setFitted(fittedSizeOf(event.currentTarget))}
        onError={() => setState({ saving: false, error: 'This photo could not be opened. Choose it again.' })} />
      <ZoomRow crop={crop} fitted={fitted} zoom={zoom} />
      <p className="hint crop-note">Drag to move · saved as {outputSize} × {outputSize} px</p>
      {state.error && <p className="field-error" role="alert">{state.error}</p>}
      <CropActions step={step} saving={state.saving} canSave={Boolean(fitted)} onCancel={onCancel}
        onSkip={() => savePhoto(wholePhoto)} onSave={() => savePhoto()} />
    </div>
  );
}
