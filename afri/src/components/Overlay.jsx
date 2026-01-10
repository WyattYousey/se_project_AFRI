import { useAppContext } from "../context/AppContext";
import { useEffect, useRef, useState } from "react";
import "../styles/Overlay.css";

const Overlay = ({ change }) => {
  const { setHighlightedChange, highlightedChange } = useAppContext();
  const overlayRef = useRef(null);
  const [styleState, setStyleState] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    visible: false,
  });

  function bboxToObject(bbox) {
    if (!bbox) return null;
    if (Array.isArray(bbox) && bbox.length >= 4) {
      const [x1, y1, x2, y2] = bbox.map(Number);
      const x = Math.min(Math.max(0, x1), 1);
      const y = Math.min(Math.max(0, y1), 1);
      const width = Math.min(Math.max(0, x2 - x1), 1);
      const height = Math.min(Math.max(0, y2 - y1), 1);
      return { x, y, width, height };
    }
    if (typeof bbox === "object") {
      const x = Number(bbox.x ?? bbox.left ?? 0);
      const y = Number(bbox.y ?? bbox.top ?? 0);
      const width = Number(bbox.width ?? bbox.w ?? 0);
      const height = Number(bbox.height ?? bbox.h ?? 0);
      if ([x, y, width, height].some((v) => Number.isNaN(v))) return null;
      return { x, y, width, height };
    }
    return null;
  }

  useEffect(() => {
    const node = overlayRef.current;
    if (!node) return;
    const parent = node.parentElement;
    const img = parent?.querySelector("img");
    if (!img) {
      console.warn("[overlay] no image element found for overlay", change);
      setStyleState((s) => ({ ...s, visible: false }));
      return;
    }

    const update = () => {
      const rect = img.getBoundingClientRect();
      const bboxObj = bboxToObject(
        change.bbox ?? change.box ?? change.boundingBox
      );
      if (!bboxObj) {
        console.warn(
          "[overlay] invalid bbox for change",
          change.id,
          change.bbox
        );
        setStyleState({ left: 0, top: 0, width: 0, height: 0, visible: false });
        return;
      }
      const left = bboxObj.x * rect.width;
      const top = bboxObj.y * rect.height;
      const width = bboxObj.width * rect.width;
      const height = bboxObj.height * rect.height;
      setStyleState({ left, top, width, height, visible: true });
    };

    update();
    window.addEventListener("resize", update);
    img.addEventListener("load", update);
    return () => {
      window.removeEventListener("resize", update);
      img.removeEventListener("load", update);
    };
  }, [change]);

  const isActive = highlightedChange === change.id;
  const { left, top, width, height, visible } = styleState;
  const impactClass = change.accessibilityImpact
    ? `impact-${String(change.accessibilityImpact).toLowerCase()}`
    : "";

  return (
    <div
      ref={overlayRef}
      className={`overlay ${isActive ? "active" : ""} ${impactClass}`}
      style={{
        position: "absolute",
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        display: visible ? "block" : "none",
      }}
      onMouseEnter={() => setHighlightedChange(change.id)}
      onMouseLeave={() => setHighlightedChange(null)}
    />
  );
};

export default Overlay;
