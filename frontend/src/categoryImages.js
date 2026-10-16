// Picture for each category, from src/assets/categories/<name>.png.
// "Oils & Ghee" -> oils-ghee.png. Unknown categories use the logo.
import logoImage from './assets/logo.png';

const imagesByFileName = import.meta.glob('./assets/categories/*.png', { eager: true, import: 'default' });

function toFileName(categoryName) {
  return categoryName.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// A name the owner typed differently ("Cooking Oils & Ghee") still finds its picture by a key word.
const pictureByKeyWord = [
  [/oil|ghee/, 'oils-ghee'], [/atta|flour|besan|maida|suji/, 'atta-flours'], [/dal|pulse|chana|rajma/, 'dals-pulses'],
  [/rice|basmati|poha/, 'rice'], [/grain|millet|daliya|oats/, 'grains-millets'], [/fruit|vegetable/, 'fruits-vegetables'],
];

function imageFor(fileName) {
  return imagesByFileName[`./assets/categories/${fileName}.png`];
}

export function categoryImageFor(categoryName) {
  const fileName = toFileName(categoryName ?? '');
  const keyWordMatch = pictureByKeyWord.find(([pattern]) => pattern.test(fileName));
  return imageFor(fileName) ?? (keyWordMatch && imageFor(keyWordMatch[1])) ?? logoImage;
}
