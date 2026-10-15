import { useEffect, useState } from 'react';
import { categoryImageFor } from '../../categoryImages.js';
import { Icon } from '../../Icon.jsx';

const banners = [
  { tone: 'cream', title: 'Pay at your door', text: 'Cash or UPI when your order arrives. No card needed.', pictures: ['Oils & Ghee', 'Atta & Flours'] },
  { tone: 'green', title: 'Pick a delivery slot that suits you', text: 'Order before the slot closes and we bring it to your door.', pictures: ['Dals & Pulses', 'Rice'] },
  { tone: 'mint', title: 'Fair prices on every pack', text: 'See the MRP and what you save on each item.', pictures: ['Grains & Millets', 'Atta & Flours'] },
];

const slideMilliseconds = 5000;
const prefersLessMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Moves to the next slide every few seconds, except while paused (hover or focus) or when the device asks for less motion.
function useAutoSlide(slideCount) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || prefersLessMotion()) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % slideCount), slideMilliseconds);
    return () => clearInterval(timer);
  }, [paused, slideCount]);
  const step = (change) => setIndex((current) => (current + change + slideCount) % slideCount);
  return { index, setIndex, step, pause: () => setPaused(true), resume: () => setPaused(false) };
}

function Banner({ banner, hidden }) {
  return (
    <div className={`banner banner-${banner.tone}`} aria-hidden={hidden}>
      <div className="banner-text"><strong>{banner.title}</strong><span>{banner.text}</span></div>
      <span className="banner-art">{banner.pictures.map((name) => <img key={name} src={categoryImageFor(name)} alt="" />)}</span>
    </div>
  );
}

// Computers only: three banners that slide by themselves, with arrows and dots.
function BannerSlider() {
  const slider = useAutoSlide(banners.length);
  return (
    <section className="banner-slider" aria-roledescription="carousel" aria-label="Offers"
      onMouseEnter={slider.pause} onMouseLeave={slider.resume} onFocus={slider.pause} onBlur={slider.resume}>
      <div className="banner-track" style={{ transform: `translateX(-${slider.index * 100}%)` }}>
        {banners.map((banner, index) => <Banner key={banner.title} banner={banner} hidden={index !== slider.index} />)}
      </div>
      <button type="button" className="banner-arrow banner-previous" onClick={() => slider.step(-1)} aria-label="Previous offer"><Icon name="back" size={18} /></button>
      <button type="button" className="banner-arrow banner-next" onClick={() => slider.step(1)} aria-label="Next offer"><Icon name="right" size={18} /></button>
      <div className="banner-dots">
        {banners.map((banner, index) => (
          <button key={banner.title} type="button" className="banner-dot" aria-current={index === slider.index} onClick={() => slider.setIndex(index)} aria-label={`Offer ${index + 1}`} />
        ))}
      </div>
    </section>
  );
}

// Phones and tablets get one offer card; computers get the slider.
export function HomeBanners() {
  return (
    <>
      <div className="offer-banner">
        <span className="offer-icon"><Icon name="cash" /></span>
        <p><strong>Pay at your door</strong>Cash or UPI when your order arrives</p>
      </div>
      <BannerSlider />
    </>
  );
}
