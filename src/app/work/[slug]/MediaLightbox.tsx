"use client";

import { useEffect, useState } from "react";

type MediaLightboxProps = {
  images: string[];
  title: string;
};

export default function MediaLightbox({
  images,
  title,
}: MediaLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  const closeLightbox = () => {
    setIsOpen(false);
  };

  const nextImage = () => {
    setCurrentIndex((current) =>
      (current + 1) % images.length
    );
  };

  const previousImage = () => {
    setCurrentIndex((current) =>
      (current - 1 + images.length) % images.length
    );
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }

      if (event.key === "ArrowRight") {
        nextImage();
      }

      if (event.key === "ArrowLeft") {
        previousImage();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* =========================
          THUMBNAILS
      ========================= */}

      <div className="lightbox-thumbnails">
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            className="lightbox-thumbnail"
            onClick={() => openLightbox(index)}
            aria-label={`View ${title} ${index + 1}`}
          >
            <img
              src={image}
              alt={`${title} ${index + 1}`}
            />

            <span className="thumbnail-overlay">
              View
            </span>
          </button>
        ))}
      </div>


      {/* =========================
          LIGHTBOX
      ========================= */}

      {isOpen && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} preview`}
          onClick={closeLightbox}
        >

          <div
            className="lightbox-inner"
            onClick={(event) => event.stopPropagation()}
          >

            {/* CLOSE */}

            <button
              type="button"
              className="lightbox-close"
              onClick={closeLightbox}
              aria-label="Close preview"
            >
              ×
            </button>


            {/* PREVIOUS */}

            {images.length > 1 && (
              <button
                type="button"
                className="lightbox-arrow lightbox-prev"
                onClick={previousImage}
                aria-label="Previous image"
              >
                ←
              </button>
            )}


            {/* IMAGE */}

            <div className="lightbox-image-wrap">
              <img
                src={images[currentIndex]}
                alt={`${title} ${currentIndex + 1}`}
                className="lightbox-image"
              />
            </div>


            {/* NEXT */}

            {images.length > 1 && (
              <button
                type="button"
                className="lightbox-arrow lightbox-next"
                onClick={nextImage}
                aria-label="Next image"
              >
                →
              </button>
            )}


            {/* COUNTER */}

            {images.length > 1 && (
              <div className="lightbox-counter">
                {String(currentIndex + 1).padStart(2, "0")}
                {" / "}
                {String(images.length).padStart(2, "0")}
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}