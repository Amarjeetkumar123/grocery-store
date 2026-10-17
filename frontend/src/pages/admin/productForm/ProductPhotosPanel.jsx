import { useState } from 'react';
import { Icon } from '../../../Icon.jsx';
import { useDialog } from '../../../components/DialogProvider.jsx';
import { useToast } from '../../../components/ToastProvider.jsx';
import { PhotoCropper } from './PhotoCropper.jsx';
import { maximumPhotos } from './usePhotoList.js';

// Photos waiting for the cropper, one after another: [{ url, fromFile, replaceId }].
function useCropQueue(list, showToast) {
  const [queue, setQueue] = useState(null);
  const close = () => {
    queue?.items.forEach((item) => item.fromFile && URL.revokeObjectURL(item.url));
    setQueue(null);
  };
  function startWithFiles(files) {
    const room = maximumPhotos - list.photos.length;
    if (files.length > room) showToast(`Only ${room} more ${room === 1 ? 'photo fits' : 'photos fit'} (up to ${maximumPhotos}).`, 'info');
    const items = files.slice(0, room).map((file) => ({ url: URL.createObjectURL(file), fromFile: true }));
    if (items.length > 0) setQueue({ items, index: 0 });
  }
  async function saveCurrent(image) {
    const item = queue.items[queue.index];
    await (item.replaceId ? list.replace(item.replaceId, image) : list.add(image));
    if (queue.index + 1 < queue.items.length) setQueue({ ...queue, index: queue.index + 1 });
    else close();
  }
  return {
    queue, close, startWithFiles, saveCurrent,
    recrop: (photo) => setQueue({ items: [{ url: photo.url, replaceId: photo.id }], index: 0 }),
  };
}

// Drag a tile onto another to put it in that place; the first place is the cover.
function usePhotoDrag(list, onReorder) {
  const [draggedId, setDraggedId] = useState(null);
  function dropOn(targetId) {
    setDraggedId(null);
    if (!draggedId || draggedId === targetId) return;
    const ids = list.photos.map((photo) => photo.id);
    const targetPlace = ids.indexOf(targetId);
    ids.splice(ids.indexOf(draggedId), 1);
    ids.splice(targetPlace, 0, draggedId);
    onReorder(ids);
  }
  return {
    draggedId,
    handlersFor: (photo) => ({
      draggable: true,
      onDragStart: () => setDraggedId(photo.id),
      onDragEnd: () => setDraggedId(null),
      onDragOver: (event) => event.preventDefault(),
      onDrop: (event) => { event.preventDefault(); dropOn(photo.id); },
    }),
  };
}

function PhotoMenu({ photo, isCover, actions }) {
  return (
    <details className="row-menu photo-menu">
      <summary className="photo-tool" aria-label="Photo options"><Icon name="more" size={14} /></summary>
      <div className="row-menu-list">
        <button type="button" onClick={() => actions.recrop(photo)}><Icon name="edit" size={15} /> Crop</button>
        {!isCover && <button type="button" onClick={() => actions.makeCover(photo)}><Icon name="star" size={15} /> Make cover</button>}
        <button type="button" className="danger-text" onClick={() => actions.remove(photo)}><Icon name="trash" size={15} /> Delete</button>
      </div>
    </details>
  );
}

function PhotoTile({ photo, isCover, actions, drag }) {
  return (
    <div className={`photo-tile${isCover ? ' photo-tile-cover' : ''}${drag.draggedId === photo.id ? ' photo-tile-dragging' : ''}`} {...drag.handlersFor(photo)}>
      <img src={photo.url} alt="" draggable={false} />
      {isCover && <span className="photo-cover-tag">Cover</span>}
      <PhotoMenu photo={photo} isCover={isCover} actions={actions} />
      <span className="photo-drag" aria-hidden="true" title="Drag to move">⋮⋮</span>
    </div>
  );
}

function AddPhotosTile({ onChoose }) {
  return (
    <label className="photo-add-tile">
      <Icon name="plus" size={18} /> Add photos
      <input type="file" accept="image/*" multiple onChange={(event) => { onChoose([...event.target.files]); event.target.value = ''; }} />
    </label>
  );
}

function usePhotoActions(list, cropQueue) {
  const dialog = useDialog();
  const showToast = useToast();
  const run = (work, done) => work().then(() => done && showToast(done)).catch((error) => showToast(error.message, 'error'));
  return {
    recrop: cropQueue.recrop,
    reorder: (photoIds) => run(() => list.reorder(photoIds), photoIds[0] !== list.photos[0].id && 'Cover photo changed'),
    makeCover: (photo) => run(() => list.reorder([photo.id, ...list.photos.filter((other) => other.id !== photo.id).map((other) => other.id)]), 'Cover photo changed'),
    async remove(photo) {
      const confirmed = await dialog.confirm({ title: 'Delete this photo?', message: 'It is removed from the shop.', confirmLabel: 'Delete', tone: 'danger' });
      if (confirmed) run(() => list.remove(photo.id), 'Photo deleted');
    },
  };
}

// Up to 6 photos; the first (big tile) is the cover on cards, the cart and search.
// Picking several opens the cropper for each in turn.
export function ProductPhotosPanel({ list, fallbackUrl }) {
  const showToast = useToast();
  const cropQueue = useCropQueue(list, showToast);
  const actions = usePhotoActions(list, cropQueue);
  const drag = usePhotoDrag(list, actions.reorder);
  const { queue } = cropQueue;
  return (
    <section className="card form-panel">
      <header className="form-panel-heading form-panel-heading-row">
        <h2>Photos</h2>
        <span className="hint">{queue && queue.items.length > 1 ? `Photo ${queue.index + 1} of ${queue.items.length}` : `${list.photos.length} of ${maximumPhotos}`}</span>
      </header>
      <div className="form-panel-body">
        {queue ? (
          <PhotoCropper key={queue.items[queue.index].url + queue.index} sourceUrl={queue.items[queue.index].url} onCancel={cropQueue.close}
            onDone={cropQueue.saveCurrent} step={queue.items.length > 1 ? { number: queue.index + 1, total: queue.items.length } : null} />
        ) : (
          <PhotoGrid list={list} fallbackUrl={fallbackUrl} actions={actions} drag={drag} onChoose={cropQueue.startWithFiles} />
        )}
      </div>
    </section>
  );
}

function PhotoGrid({ list, fallbackUrl, actions, drag, onChoose }) {
  if (list.photos.length === 0) {
    return (
      <>
        <div className="photo-current"><span className="photo-tag">Category picture</span><img src={fallbackUrl} alt="" /></div>
        <p className="hint">Optional. Without photos, the shop shows the category picture.</p>
        <label className="button button-outline button-compact file-button align-start">
          <Icon name="upload" /> Choose photos
          <input type="file" accept="image/*" multiple onChange={(event) => { onChoose([...event.target.files]); event.target.value = ''; }} />
        </label>
      </>
    );
  }
  return (
    <>
      <div className="photo-grid">
        {list.photos.map((photo, index) => <PhotoTile key={photo.id} photo={photo} isCover={index === 0} actions={actions} drag={drag} />)}
        {list.photos.length < maximumPhotos && <AddPhotosTile onChoose={onChoose} />}
      </div>
      <p className="hint">The first photo is the cover. Drag to change the order. Up to {maximumPhotos}.</p>
    </>
  );
}
