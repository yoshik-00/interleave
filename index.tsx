import React from "react";
import { createRoot } from "react-dom/client";
import Interleave from "./interleaveApp";
import "./styles.css";

// React 18/19のcreateRoot APIを使用
const container = document.getElementById("root");
if (!container) throw new Error("Failed to find the root element");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Interleave />
  </React.StrictMode>
);
