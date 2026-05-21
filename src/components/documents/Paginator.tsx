"use client";

import React, { useLayoutEffect, useRef, useState } from "react";

// ── types ──────────────────────────────────────────────────────────────────────

export interface DocumentPaginatorProps {
  children: React.ReactNode;
  zoom?: number;
  letterhead?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
}

// ── main component ─────────────────────────────────────────────────────────────

/**
 * Renders document content across multiple A4 pages.
 *
 * Strategy: use CSS multi-column layout to paginate at *line boundaries*.
 *
 * We render the whole document in a single multi-column flow whose column
 * height equals the usable page height (A4 minus paddings) and whose column
 * width equals the usable page width. The browser then flows content into the
 * next column at line breaks (Word-like). Each visual page is just a clipped
 * viewport that shows one column via translateX.
 */
export function DocumentPaginator({
  children,
  zoom = 1,
  letterhead,
  paddingTop = "3cm",
  paddingRight = "2.5cm",
  paddingBottom = "3cm",
  paddingLeft = "2.5cm",
}: DocumentPaginatorProps) {
  const rulerHeightRef = useRef<HTMLDivElement>(null);
  const rulerWidthRef = useRef<HTMLDivElement>(null);
  const measureFlowRef = useRef<HTMLDivElement>(null);

  // pageContentHeight/pageContentWidth: available px per page (at 1:1 scale, no zoom)
  // pageCount: how many A4 pages the content fills
  const [layout, setLayout] = useState({
    pageCount: 1,
    pageContentHeight: 0,
    pageContentWidth: 0,
  });

  // No deps — runs after every render so content changes are re-measured.
  // The functional setState with reference equality check prevents infinite loops:
  // when measurements don't change the state object reference stays the same
  // and React bails out of the re-render.
  useLayoutEffect(() => {
    const rulerHeight = rulerHeightRef.current;
    const rulerWidth = rulerWidthRef.current;
    const flow = measureFlowRef.current;
    if (!rulerHeight || !rulerWidth || !flow) return;

    const availableHeight = rulerHeight.getBoundingClientRect().height;
    const availableWidth = rulerWidth.getBoundingClientRect().width;
    if (availableHeight <= 0 || availableWidth <= 0) return;

    // In multi-column layout, the rendered content extends horizontally.
    // scrollWidth gives the total width across all columns.
    const totalWidth = flow.scrollWidth;
    const pageCount = Math.max(1, Math.ceil((totalWidth - 0.5) / availableWidth));

    setLayout((prev) =>
      prev.pageCount === pageCount &&
      prev.pageContentHeight === availableHeight &&
      prev.pageContentWidth === availableWidth
        ? prev
        : {
            pageCount,
            pageContentHeight: availableHeight,
            pageContentWidth: availableWidth,
          }
    );
  });

  const docTypography: React.CSSProperties = {
    fontFamily: "Arial, sans-serif",
    fontSize: "12pt",
    lineHeight: 1.5,
    color: "#020D25",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    hyphens: "auto",
  };

  return (
    <>
      {/*
        Ruler: a zero-width element whose CSS height equals the content area
        per page. getBoundingClientRect().height gives the exact pixel value
        for the current screen DPI — no hard-coded px constants needed.
      */}
      <div
        ref={rulerHeightRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          width: "1px",
          height: `calc(297mm - ${paddingTop} - ${paddingBottom})`,
          pointerEvents: "none",
          visibility: "hidden",
        }}
      />

      {/* Width ruler for the usable content width */}
      <div
        ref={rulerWidthRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          height: "1px",
          width: `calc(210mm - ${paddingLeft} - ${paddingRight})`,
          pointerEvents: "none",
          visibility: "hidden",
        }}
      />

      {/*
        Measurement container: renders the full content in a multi-column flow.
        We measure scrollWidth to compute pageCount.
      */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          width: `calc(210mm - ${paddingLeft} - ${paddingRight})`,
          height: `calc(297mm - ${paddingTop} - ${paddingBottom})`,
          pointerEvents: "none",
          visibility: "hidden",
          ...docTypography,
        }}
      >
        <div
          ref={measureFlowRef}
          style={{
            height: "100%",
            columnFill: "auto",
            columnGap: 0,
            // columnWidth must be a length; we use the same calc as the container width.
            columnWidth: `calc(210mm - ${paddingLeft} - ${paddingRight})`,
          }}
        >
          {children}
        </div>
      </div>

      {/* Visible pages */}
      <div
        style={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          zoom: zoom as any,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          alignItems: "center",
        }}
      >
        {Array.from({ length: layout.pageCount }, (_, i) => (
          <A4Page
            key={i}
            letterhead={letterhead}
            paddingTop={paddingTop}
            paddingRight={paddingRight}
            paddingBottom={paddingBottom}
            paddingLeft={paddingLeft}
            pageContentHeight={layout.pageContentHeight}
            pageContentWidth={layout.pageContentWidth}
            contentOffsetX={i * layout.pageContentWidth}
            docTypography={docTypography}
          >
            {children}
          </A4Page>
        ))}
      </div>
    </>
  );
}

// ── A4Page ─────────────────────────────────────────────────────────────────────

function A4Page({
  children,
  letterhead,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  pageContentHeight,
  pageContentWidth,
  contentOffsetX,
  docTypography,
}: {
  children: React.ReactNode;
  letterhead?: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  pageContentHeight: number;
  pageContentWidth: number;
  contentOffsetX: number;
  docTypography: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: "relative",
        background: "#FFFFFF",
        borderRadius: 6,
        overflow: "hidden",
        boxShadow:
          "0 1px 3px rgba(2,13,37,0.06), 0 12px 36px rgba(2,13,37,0.08)",
        width: "210mm",
        height: "297mm",
        color: "#020D25",
        fontFamily: "Arial, sans-serif",
        fontSize: "12pt",
        flexShrink: 0,
      }}
    >
      {letterhead && (
        <img
          src={letterhead}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "fill",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      )}
      {/*
        Content area: clips to available height via overflow:hidden.
        The inner div shifts the full content upward so that page N shows
        the slice [N * pageContentHeight, (N+1) * pageContentHeight].
      */}
      <div
        style={{
          position: "relative",
          height: "100%",
          boxSizing: "border-box",
          paddingTop,
          paddingRight,
          paddingBottom,
          paddingLeft,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: pageContentHeight > 0 ? `${pageContentHeight}px` : "100%",
              width: pageContentWidth > 0 ? `${pageContentWidth}px` : "100%",
              columnFill: "auto",
              columnGap: 0,
              columnWidth: pageContentWidth > 0 ? `${pageContentWidth}px` : "auto",
              transform: `translateX(-${contentOffsetX}px)`,
              ...docTypography,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
