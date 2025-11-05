/*
 * Filename: ListingImageGrid.tsx
 * Purpose: 1-big-2-small image grid with modal gallery (Airbnb pattern)
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Modal from '@/app/components/ui/Modal';
import Button from '@/app/components/ui/Button';
import styles from './ListingImageGrid.module.css';

interface ListingImageGridProps {
  images: string[];
  listingTitle: string;
}

export default function ListingImageGrid({ images, listingTitle }: ListingImageGridProps) {
  const [showModal, setShowModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Defensive: ensure we have at least 1 image
  const heroImage = images[0] || '/placeholder-listing.jpg';
  const galleryImages = images.slice(1, 3); // Next 2 images
  const remainingCount = Math.max(0, images.length - 3);

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setShowModal(true);
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <>
      {/* Image Grid */}
      <div className={styles.grid}>
        {/* Hero Image: 2/4 columns */}
        <div className={styles.heroImage} onClick={() => handleImageClick(0)}>
          <Image
            src={heroImage}
            alt={`${listingTitle} - Main image`}
            fill
            className={styles.image}
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        {/* Gallery Grid: 2/4 columns */}
        <div className={styles.galleryGrid}>
          {galleryImages.map((img, idx) => (
            <div
              key={idx}
              className={styles.galleryImage}
              onClick={() => handleImageClick(idx + 1)}
            >
              <Image
                src={img}
                alt={`${listingTitle} - Gallery image ${idx + 1}`}
                fill
                className={styles.image}
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
          ))}

          {/* Show All Photos Button (if more than 3 images) */}
          {remainingCount > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className={styles.showAllButton}
            >
              <span className={styles.gridIcon}>⊞</span>
              Show all {images.length} photos
            </button>
          )}
        </div>
      </div>

      {/* Modal Gallery */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Listing Photos"
        >
          <div className={styles.modalContent}>
            {/* Current Image */}
            <div className={styles.modalImageContainer}>
              <Image
                src={images[currentImageIndex]}
                alt={`${listingTitle} - Image ${currentImageIndex + 1}`}
                fill
                className={styles.modalImage}
                sizes="90vw"
              />
            </div>

            {/* Navigation */}
            <div className={styles.modalNav}>
              <Button
                variant="secondary"
                onClick={handlePrev}
                disabled={images.length === 1}
              >
                ← Previous
              </Button>
              <span className={styles.modalCounter}>
                {currentImageIndex + 1} / {images.length}
              </span>
              <Button
                variant="secondary"
                onClick={handleNext}
                disabled={images.length === 1}
              >
                Next →
              </Button>
            </div>

            {/* Thumbnail Strip */}
            <div className={styles.thumbnailStrip}>
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`${styles.thumbnail} ${
                    idx === currentImageIndex ? styles.activeThumbnail : ''
                  }`}
                  onClick={() => setCurrentImageIndex(idx)}
                >
                  <Image
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    className={styles.thumbnailImage}
                    sizes="100px"
                  />
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
