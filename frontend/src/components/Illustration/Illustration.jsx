import React from 'react';
import './Illustration.css';

/**
 * Reusable Person Illustration (DESIGN.md 3.6)
 * Flat figure (~48 x 77px) with round head, rounded body, two legs.
 * Variants: 'hat' | 'backpack' | 'camera'
 */
export function PersonIllustration({ variant = 'hat', className = '' }) {
  if (variant === 'backpack') {
    return (
      <svg
        className={`ayn-illustration ayn-illustration--person ${className}`}
        viewBox="0 0 48 77"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Head */}
        <circle cx="24" cy="14" r="8" fill="#D49A6A" />
        {/* Hair */}
        <path d="M16 13C16 9 20 6 24 6C28 6 32 9 32 13C30 11 26 10 24 10C20 10 17 11 16 13Z" fill="#2B2118" />
        {/* Backpack strap / backpack side */}
        <rect x="9" y="27" width="6" height="20" rx="3" fill="#1F5F8B" />
        {/* Body (teal/blue jacket) */}
        <rect x="14" y="24" width="20" height="26" rx="6" fill="#1F5F8B" />
        {/* Legs */}
        <rect x="16" y="50" width="6" height="23" rx="3" fill="#2B2118" />
        <rect x="26" y="50" width="6" height="23" rx="3" fill="#2B2118" />
      </svg>
    );
  }

  if (variant === 'camera') {
    return (
      <svg
        className={`ayn-illustration ayn-illustration--person ${className}`}
        viewBox="0 0 48 77"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Head */}
        <circle cx="24" cy="14" r="8" fill="#D49A6A" />
        {/* Beanie / cap */}
        <path d="M17 12C17 7 20 5 24 5C28 5 31 7 31 12H17Z" fill="#7A6A5A" />
        <circle cx="24" cy="4" r="2" fill="#7A6A5A" />
        {/* Body (green jacket) */}
        <rect x="14" y="24" width="20" height="26" rx="6" fill="#2F6B4A" />
        {/* Camera strap */}
        <path d="M18 24L30 36" stroke="#2B2118" strokeWidth="1.5" />
        {/* Camera */}
        <rect x="25" y="34" width="10" height="7" rx="2" fill="#2B2118" />
        {/* Legs */}
        <rect x="16" y="50" width="6" height="23" rx="3" fill="#2B2118" />
        <rect x="26" y="50" width="6" height="23" rx="3" fill="#2B2118" />
      </svg>
    );
  }

  // Default: 'hat' (Terracotta/warm jacket with round sun hat)
  return (
    <svg
      className={`ayn-illustration ayn-illustration--person ${className}`}
      viewBox="0 0 48 77"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Hat brim */}
      <ellipse cx="24" cy="13" rx="14" ry="4" fill="#F5A623" />
      <path d="M18 13C18 9 20 7 24 7C28 7 30 9 30 13H18Z" fill="#F5A623" />
      {/* Head */}
      <circle cx="24" cy="15" r="7" fill="#D49A6A" />
      {/* Body (terracotta jacket) */}
      <rect x="14" y="24" width="20" height="26" rx="6" fill="#B5472F" />
      {/* Legs */}
      <rect x="16" y="50" width="6" height="23" rx="3" fill="#2B2118" />
      <rect x="26" y="50" width="6" height="23" rx="3" fill="#2B2118" />
    </svg>
  );
}

/**
 * Reusable Cloud Illustration (DESIGN.md 3.6)
 * White rounded blobs (circles plus rounded base), 100 to 210px wide.
 */
export function CloudIllustration({ width = 160, className = '' }) {
  const height = Math.round(width * 0.52);
  return (
    <svg
      className={`ayn-illustration ayn-illustration--cloud ${className}`}
      width={width}
      height={height}
      viewBox="0 0 160 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M28 70C15 70 5 60 5 48C5 37 13 28 24 26C27 12 39 2 54 2C67 2 78 10 82 22C87 18 94 16 101 16C115 16 127 27 128 41C138 42 146 50 146 60C146 71 137 70 126 70H28Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * Reusable Arch Scene Illustrations for Feature Cards & Hero
 * Types: 'pyramids' | 'nile' | 'redsea' | 'luxor'
 */
export function ArchSceneIllustration({ type = 'pyramids', className = '' }) {
  if (type === 'pyramids') {
    return (
      <svg
        className={`ayn-illustration ayn-illustration--arch-scene ${className}`}
        viewBox="0 0 200 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="200" height="150" fill="#E8D9C0" />
        {/* Sun */}
        <circle cx="155" cy="45" r="18" fill="#F5A623" />
        {/* Small Pyramid */}
        <polygon points="120,130 165,65 190,130" fill="#993822" />
        {/* Big Pyramid */}
        <polygon points="20,130 85,38 150,130" fill="#B5472F" />
        {/* Sand base */}
        <path d="M0 120 Q60 115 120 125 T200 120 V150 H0 Z" fill="#D6C4A6" />
      </svg>
    );
  }

  if (type === 'nile') {
    return (
      <svg
        className={`ayn-illustration ayn-illustration--arch-scene ${className}`}
        viewBox="0 0 200 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="200" height="150" fill="#CFE3E8" />
        {/* Sun */}
        <circle cx="45" cy="40" r="14" fill="#F5A623" />
        {/* Nile Water */}
        <rect y="70" width="200" height="80" fill="#1F5F8B" />
        {/* Sailboat (Felucca) */}
        <polygon points="105,40 105,74 135,74" fill="#FFFFFF" />
        <path d="M96 74 L138 74 L130 82 L102 82 Z" fill="#FFFFFF" />
        {/* Palm tree silhouette */}
        <path d="M185 85 Q180 55 178 45" stroke="#2F6B4A" strokeWidth="3" />
        <path d="M178 45 Q168 35 162 42" stroke="#2F6B4A" strokeWidth="2.5" />
        <path d="M178 45 Q175 32 185 36" stroke="#2F6B4A" strokeWidth="2.5" />
        <path d="M178 45 Q192 42 190 50" stroke="#2F6B4A" strokeWidth="2.5" />
      </svg>
    );
  }

  if (type === 'redsea') {
    return (
      <svg
        className={`ayn-illustration ayn-illustration--arch-scene ${className}`}
        viewBox="0 0 200 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="200" height="150" fill="#F5EFE6" />
        {/* Mountains */}
        <polygon points="5,76 80,40 145,76" fill="#7A5232" />
        <polygon points="110,76 155,48 195,76" fill="#5C3B20" />
        {/* Red Sea */}
        <rect y="76" width="200" height="74" fill="#2A7B9B" />
        {/* Wave lines */}
        <path d="M0 90 Q25 84 50 90 T100 90 T150 90 T200 90" stroke="#CFE3E8" strokeWidth="2" fill="none" />
        <path d="M0 115 Q25 109 50 115 T100 115 T150 115 T200 115" stroke="#CFE3E8" strokeWidth="2" fill="none" />
      </svg>
    );
  }

  // 'luxor' - Temples of Luxor columns
  return (
    <svg
      className={`ayn-illustration ayn-illustration--arch-scene ${className}`}
      viewBox="0 0 200 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="200" height="150" fill="#E8D9C0" />
      {/* Sun */}
      <circle cx="35" cy="45" r="16" fill="#F5A623" />
      {/* 4 Columns */}
      <g fill="#B5472F">
        {/* Column 1 */}
        <rect x="25" y="45" width="20" height="85" rx="3" />
        <rect x="21" y="40" width="28" height="6" rx="2" />
        {/* Column 2 */}
        <rect x="68" y="45" width="20" height="85" rx="3" />
        <rect x="64" y="40" width="28" height="6" rx="2" />
        {/* Column 3 */}
        <rect x="111" y="45" width="20" height="85" rx="3" />
        <rect x="107" y="40" width="28" height="6" rx="2" />
        {/* Column 4 */}
        <rect x="154" y="45" width="20" height="85" rx="3" />
        <rect x="150" y="40" width="28" height="6" rx="2" />
      </g>
      {/* Floor / ground */}
      <rect y="125" width="200" height="25" fill="#D6C4A6" />
    </svg>
  );
}
