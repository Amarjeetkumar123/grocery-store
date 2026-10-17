import { useEffect, useRef, useState } from 'react';
import { categoryImageFor } from '../../categoryImages.js';
import { Icon } from '../../Icon.jsx';

// A row of photos that snaps one per screen width. Swiping is the browser's own
// scrolling; index follows it, and goTo() scrolls to a photo.
function useSlider(startIndex = 0) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(startIndex);
  const goTo = (photoIndex, behavior = 'smooth') => {
    const track = trackRef.current;
    track?.scrollTo({ left: photoIndex * track.clientWidth, behavior });
  };
  const onScroll = (event) => setIndex(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth));
  return { trackRef, index, goTo, onScroll };
}

// Real photos, or the category drawing when the product has none.
export function galleryPhotosOf(product) {
  if (product.photos?.length > 0) return product.photos;
  return [{ id: 'category', url: categoryImageFor(product.categoryName), drawing: true }];
}

function Thumbnails({ photos, index, onChoose, className }) {
  if (photos.length < 2) return null;
  return (
    <div className={className} role="group" aria-label="Photos">
      {photos.map((photo, photoIndex) => (
        <button key={photo.id} type="button" aria-pressed={photoIndex === index} aria-label={`Photo ${photoIndex + 1}`}
          onClick={() => onChoose(photoIndex)} onMouseEnter={() => onChoose(photoIndex)}>
          <img src={photo.url} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  );
}

function Dots({ count, index }) {
  if (count < 2) return null;
  return (
    <>
      <span className="gallery-dots" aria-hidden="true">{Array.from({ length: count }, (unused, dot) => <i key={dot} className={dot === index ? 'gallery-dot-on' : undefined} />)}</span>
      <span className="gallery-counter">{index + 1} / {count}</span>
    </>
  );
}

// Full screen: swipe between photos, pinch to zoom (the browser's own), close with ×, Esc or a swipe down.
function PhotoViewer({ photos, startIndex, onClose }) {
  const dialogRef = useRef(null);
  const slider = useSlider(startIndex);
  const touchStartY = useRef(null);
  // Opens once, at the photo that was tapped.
  useEffect(() => {
    if (!dialogRef.current.open) dialogRef.current.showModal();
    slider.goTo(startIndex, 'instant');
  }, []);
  function onKeyDown(event) {
    if (event.key === 'ArrowRight') slider.goTo(Math.min(slider.index + 1, photos.length - 1));
    if (event.key === 'ArrowLeft') slider.goTo(Math.max(slider.index - 1, 0));
  }
  return (
    <dialog ref={dialogRef} className="photo-viewer" aria-label="Photos" onCancel={(event) => { event.preventDefault(); onClose(); }} onKeyDown={onKeyDown}
      onTouchStart={(event) => { touchStartY.current = event.touches[0].clientY; }}
      onTouchEnd={(event) => { if (event.changedTouches[0].clientY - touchStartY.current > 90) onClose(); }}>
      <div className="photo-viewer-top">
        <span>{photos.length > 1 ? `${slider.index + 1} / ${photos.length}` : ''}</span>
        <button type="button" className="photo-viewer-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </div>
      <div className="gallery-track photo-viewer-track" ref={slider.trackRef} onScroll={slider.onScroll}>
        {photos.map((photo) => <img key={photo.id} src={photo.url} alt="" className={photo.drawing ? 'gallery-drawing' : undefined} />)}
      </div>
      <p className="photo-viewer-hint">{photos.length > 1 ? 'Pinch to zoom · swipe for more' : 'Pinch to zoom'}</p>
      <Thumbnails photos={photos} index={slider.index} onChoose={(photoIndex) => slider.goTo(photoIndex)} className="photo-viewer-thumbnails" />
    </dialog>
  );
}

// Product page photos: swipe on phones, arrows and thumbnails on computers; tap for full screen.
export function ProductGallery({ product, children }) {
  const photos = galleryPhotosOf(product);
  const slider = useSlider();
  const [viewerIndex, setViewerIndex] = useState(null);
  const step = (direction) => slider.goTo(Math.min(Math.max(slider.index + direction, 0), photos.length - 1));
  return (
    <div className="product-gallery">
      <div className="gallery-stage">
        <div className="gallery-track" ref={slider.trackRef} onScroll={slider.onScroll}>
          {photos.map((photo, photoIndex) => (
            <button key={photo.id} type="button" className="gallery-slide" onClick={() => setViewerIndex(photoIndex)} aria-label={`Open photo ${photoIndex + 1} full screen`}>
              <img src={photo.url} alt={photoIndex === 0 ? product.name : ''} className={photo.drawing ? 'gallery-drawing' : undefined} loading={photoIndex === 0 ? 'eager' : 'lazy'} />
            </button>
          ))}
        </div>
        {photos.length > 1 && <button type="button" className="gallery-arrow gallery-arrow-back" onClick={() => step(-1)} disabled={slider.index === 0} aria-label="Previous photo"><Icon name="back" size={18} /></button>}
        {photos.length > 1 && <button type="button" className="gallery-arrow gallery-arrow-next" onClick={() => step(1)} disabled={slider.index === photos.length - 1} aria-label="Next photo"><Icon name="right" size={18} /></button>}
        <Dots count={photos.length} index={slider.index} />
        {children}
      </div>
      <Thumbnails photos={photos} index={slider.index} onChoose={(photoIndex) => slider.goTo(photoIndex)} className="gallery-thumbnails" />
      {viewerIndex !== null && <PhotoViewer photos={photos} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />}
    </div>
  );
}
