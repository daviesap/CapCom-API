import { useEffect, useRef } from "react";

const focusableSelector =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]:not([tabindex="-1"]), [tabindex]:not([disabled]):not([tabindex="-1"]), [contenteditable="true"]';

export default function Modal({
  title,
  subtitle,
  labelledBy,
  onClose,
  children,
}) {
  const sectionRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = labelledBy || "modalTitle";

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const modalElement = sectionRef.current;
    const dialogRoot = modalElement?.closest(".overlay-panel") || modalElement;
    if (!modalElement) return undefined;
    const previousActiveElement = document.activeElement;

    const getFocusableElements = () =>
      Array.from(modalElement.querySelectorAll(focusableSelector)).filter(
        (element) => element.tabIndex >= 0
      );

    const focusables = getFocusableElements();
    const fallbackFocusElement = dialogRoot && "focus" in dialogRoot ? dialogRoot : null;
    const targetElement = focusables[0] || fallbackFocusElement;
    targetElement?.focus?.();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, []);

  return (
    <div className="overlay-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="overlay-panel"
        ref={sectionRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="overlay-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}
