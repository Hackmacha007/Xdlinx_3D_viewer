# 🛰️ XDLinx 3D Viewer & AutoCAD 2D Engineering Studio

> **Professional Space Labs 3D CAD Engine & Automated AutoCAD 2D Engineering Studio**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-00f0ff.svg)](https://hackmacha007.github.io/Xdlinx_3D_viewer/website/index.html)

---

## 🌟 Key Features

### 1. 🌐 High-Performance 3D CAD Viewing
- **Multi-Format 3D Support**: Native rendering for `STEP (.stp, .step)`, `IGES (.igs)`, `STL`, `OBJ`, `3DM`, `FBX`, `GLTF / GLB`, `IFC`, `BIM`, `3MF`, `AMF`, and `BREP`.
- **WebGL Hardware Acceleration**: Interactive rotation, pan, zoom, section views, exploding assemblies, measurement, and environment lighting maps.

### 2. 📐 Automated AutoCAD 2D Engineering Studio
- **4 Projected Engineering Views**: Instantly projects **Front View**, **Top View**, **Right View**, and **Isometric View** directly from loaded 3D B-Rep CAD geometry.
- **Auto-Dimensioning Engine**: Computes high-precision linear dimensions ($D_x, D_y, D_z$), hole callouts ($8\times\varnothing8.50\text{ mm THRU}$), PCD pitch circle diameters, and center recess radii.

### 3. 🧮 Real 3D B-Rep Mathematical Calculations
- **Exact Signed Volume ($V$)**: Uses the exact mathematical Gauss divergence theorem ($\sum \frac{\vec{a} \cdot (\vec{b} \times \vec{c})}{6}$) on mesh geometry ($\text{mm}^3$).
- **Exact Surface Area ($A$)**: Sums real 3D triangle cross-product vector areas ($\text{mm}^2$).
- **Center of Gravity (CoG)**: Computes exact $CoG_x, CoG_y, CoG_z$ centroid coordinates.
- **Material Mass Selector**: Real-time mass calculation in **kg** and **lbs** for *Aluminum 6061-T6, Stainless Steel 316L, Titanium Ti-6Al-4V, Copper C11000, and PEEK*.

### 4. 📄 1-Click Vector PDF Export
- Exports print-ready A3/A4 landscape PDFs containing **all 4 projected views, auto-dimensions, exact calculation table, and ISO 128 title block**.

---

## 🚀 Live Demo & Local Development

### Live Website
👉 **[https://hackmacha007.github.io/Xdlinx_3D_viewer/website/index.html](https://hackmacha007.github.io/Xdlinx_3D_viewer/website/index.html)**

### Running Locally
1. Clone repository:
   ```bash
   git clone https://github.com/Hackmacha007/Xdlinx_3D_viewer.git
   cd Xdlinx_3D_viewer
   ```
2. Install dependencies & build:
   ```bash
   npm install
   npm run build_dev
   ```
3. Start local server:
   ```bash
   python -m http.server 9000
   ```
   Open `http://localhost:9000/website/index.html` in browser!

---

## 📜 License & Acknowledgements

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

*Built with inspiration and core rendering components from the open-source [Online3DViewer](https://github.com/kovacsv/Online3DViewer) engine by Viktor Kovacs.*
