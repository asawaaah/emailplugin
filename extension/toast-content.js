"use strict";
(() => {
  // src/content/toast.ts
  var WIDTH = 376;
  function setup() {
    let host = null;
    let frame = null;
    let lastPointerSignal = 0;
    const onPointerMove = () => {
      const now = Date.now();
      if (!frame?.contentWindow || now - lastPointerSignal < 200) return;
      lastPointerSignal = now;
      frame.contentWindow.postMessage({ type: "apercu-gmail-pointer-out" }, new URL(frame.src).origin);
    };
    const mount = (src, position) => {
      if (!host || !frame) {
        host = document.createElement("apercu-gmail-bubble");
        const root = host.attachShadow({ mode: "closed" });
        frame = document.createElement("iframe");
        frame.title = "Aper\xE7u Gmail";
        frame.style.height = "0px";
        frame.style.visibility = "hidden";
        root.append(frame);
      }
      Object.assign(frame.style, {
        position: "fixed",
        right: "8px",
        top: position === "top-right" ? "8px" : "auto",
        bottom: position === "bottom-right" ? "8px" : "auto",
        width: `${WIDTH}px`,
        maxWidth: "calc(100vw - 16px)",
        border: "0",
        margin: "0",
        padding: "0",
        background: "transparent",
        colorScheme: "normal",
        zIndex: "2147483647"
      });
      if (frame.src !== src) frame.src = src;
      if (!host.isConnected) {
        document.documentElement.append(host);
        document.addEventListener("mousemove", onPointerMove, { passive: true });
      }
    };
    const clear = () => {
      document.removeEventListener("mousemove", onPointerMove);
      host?.remove();
      host = null;
      frame = null;
    };
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (sender.id !== chrome.runtime.id) return false;
      if (message.type === "mountBubble") {
        mount(message.src, message.position);
      } else if (message.type === "resizeBubble" && frame) {
        frame.style.height = `${Math.max(0, Math.min(message.height, window.innerHeight - 16))}px`;
        frame.style.visibility = "visible";
      } else if (message.type === "clearToasts") {
        clear();
      }
      return false;
    });
  }
  if (!window.__apercuGmailBubble) {
    window.__apercuGmailBubble = true;
    setup();
  }
})();
