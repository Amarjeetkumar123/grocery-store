// Picture for each category, from src/assets/categories/<name>.png.
// "Oils & Ghee" -> oils-ghee.png. Unknown categories use the logo.
import logoImage from './assets/logo.png';

const imagesByFileName = import.meta.glob('./assets/categories/*.png', { eager: true, import: 'default' });

function toFileName(categoryName) {
  return categoryName.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function categoryImageFor(categoryName) {
  return imagesByFileName[`./assets/categories/${toFileName(categoryName ?? '')}.png`] ?? logoImage;
}
