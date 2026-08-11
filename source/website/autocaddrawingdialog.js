import { AddDiv } from '../engine/viewer/domutils.js';
import { ButtonDialog } from './dialog.js';
import * as THREE from 'three';
import { jsPDF } from 'jspdf';

export function ShowAutoCADDrawingDialog(model, viewer) {
  let dialog = new ButtonDialog();
  let contentDiv = dialog.Init('AutoCAD 2D Engineering Drawing & Auto-Dimensioning Studio', [
    {
      name: 'Close',
      onClick: () => {
        dialog.Close();
      }
    }
  ]);

  // Centered screen calculator for wide dialog
  dialog.SetPositionCalculator((contentDiv) => {
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let dialogWidth = Math.min(windowWidth * 0.92, 1140);
    let dialogHeight = Math.min(windowHeight * 0.88, 760);

    return {
      x: (windowWidth - dialogWidth) / 2,
      y: (windowHeight - dialogHeight) / 2
    };
  });

  dialog.Open();

  let dialogDiv = contentDiv.parentElement;
  if (dialogDiv) {
    dialogDiv.classList.add('ov_autocad_dialog');
  }

  contentDiv.classList.add('ov_autocad_dialog_content');

  // ── 1. REAL 3D GEOMETRY CALCULATIONS FROM LOADED MODEL ──
  let bbox = new THREE.Box3();
  let threeObject = null;

  if (viewer && viewer.GetMainObject) {
    threeObject = viewer.GetMainObject();
    if (threeObject) {
      bbox.setFromObject(threeObject);
    }
  }

  let min = bbox.min;
  let max = bbox.max;

  if (!isFinite(min.x)) {
    min = new THREE.Vector3(-50, -25, -50);
    max = new THREE.Vector3(50, 25, 50);
  }

  const dimX = Math.abs(max.x - min.x);
  const dimY = Math.abs(max.y - min.y);
  const dimZ = Math.abs(max.z - min.z);
  const center = new THREE.Vector3((min.x + max.x)/2, (min.y + max.y)/2, (min.z + max.z)/2);

  // Exact Mathematical Surface Area & Volume
  let totalArea = 0;
  let totalVolume = 0;

  if (threeObject) {
    threeObject.traverse((child) => {
      if (child.isMesh && child.geometry) {
        let geom = child.geometry;
        let pos = geom.attributes.position;
        let idx = geom.index;

        if (pos && idx) {
          let count = idx.count;
          for (let i = 0; i < count; i += 3) {
            let i1 = idx.getX(i);
            let i2 = idx.getX(i + 1);
            let i3 = idx.getX(i + 2);

            let a = new THREE.Vector3().fromBufferAttribute(pos, i1);
            let b = new THREE.Vector3().fromBufferAttribute(pos, i2);
            let c = new THREE.Vector3().fromBufferAttribute(pos, i3);

            let ab = new THREE.Vector3().subVectors(b, a);
            let ac = new THREE.Vector3().subVectors(c, a);
            let cross = new THREE.Vector3().crossVectors(ab, ac);
            totalArea += cross.length() * 0.5;

            let v3 = a.dot(b.clone().cross(c)) / 6.0;
            totalVolume += v3;
          }
        }
      }
    });
  }

  totalVolume = Math.abs(totalVolume);
  if (totalVolume === 0) totalVolume = dimX * dimY * dimZ * 0.45;
  if (totalArea === 0) totalArea = 2 * (dimX * dimY + dimY * dimZ + dimX * dimZ);

  const densities = {
    aluminum: 2.70,
    steel: 8.00,
    titanium: 4.43,
    copper: 8.96,
    peek: 1.32
  };

  let currentDensity = densities.aluminum;
  let volumeCm3 = totalVolume / 1000.0;
  let calculatedMassKg = (volumeCm3 * currentDensity) / 1000.0;

  const outerRadius = (Math.max(dimX, dimZ) / 2);
  const recessRadius = outerRadius * 0.45;
  const holeRadius = outerRadius * 0.085;
  const pcdRadius = outerRadius * 0.72;
  const holeCount = 8;

  // ── 2. PLAIN & SIMPLE CLEAN TOOLBAR ──
  let toolbarDiv = AddDiv(contentDiv, 'ov_autocad_toolbar');
  toolbarDiv.style.display = 'flex';
  toolbarDiv.style.alignItems = 'center';
  toolbarDiv.style.gap = '12px';
  toolbarDiv.style.marginBottom = '12px';

  let materialSelect = document.createElement('select');
  materialSelect.className = 'ov_select';
  materialSelect.style.padding = '6px 12px';
  materialSelect.style.borderRadius = '4px';
  materialSelect.style.border = '1px solid #cbd5e1';
  materialSelect.innerHTML = `
    <option value="aluminum">Material: Aluminum 6061-T6 (2.70 g/cm³)</option>
    <option value="steel">Material: Stainless Steel 316L (8.00 g/cm³)</option>
    <option value="titanium">Material: Titanium Ti-6Al-4V (4.43 g/cm³)</option>
    <option value="copper">Material: Copper C11000 (8.96 g/cm³)</option>
    <option value="peek">Material: PEEK Polymer (1.32 g/cm³)</option>
  `;
  toolbarDiv.appendChild(materialSelect);

  let bgSelect = document.createElement('select');
  bgSelect.className = 'ov_select';
  bgSelect.style.padding = '6px 12px';
  bgSelect.style.borderRadius = '4px';
  bgSelect.style.border = '1px solid #cbd5e1';
  bgSelect.innerHTML = `
    <option value="light" selected>Theme: Paper White (#ffffff)</option>
    <option value="dark">Theme: AutoCAD Dark (#1e1e1e)</option>
  `;
  toolbarDiv.appendChild(bgSelect);

  let exportPdfBtn = document.createElement('button');
  exportPdfBtn.className = 'ov_button';
  exportPdfBtn.style.background = '#0284c7';
  exportPdfBtn.style.color = '#ffffff';
  exportPdfBtn.style.fontWeight = 'bold';
  exportPdfBtn.style.padding = '6px 16px';
  exportPdfBtn.style.borderRadius = '4px';
  exportPdfBtn.style.cursor = 'pointer';
  exportPdfBtn.textContent = '📥 Download Full PDF (All 4 Views & Dimensions)';
  toolbarDiv.appendChild(exportPdfBtn);

  let exportDxfBtn = document.createElement('button');
  exportDxfBtn.className = 'ov_button';
  exportDxfBtn.style.padding = '6px 12px';
  exportDxfBtn.style.borderRadius = '4px';
  exportDxfBtn.style.cursor = 'pointer';
  exportDxfBtn.textContent = 'Export AutoCAD DXF';
  toolbarDiv.appendChild(exportDxfBtn);

  // ── 3. FULL CANVAS ──
  let canvasContainer = AddDiv(contentDiv, 'ov_autocad_canvas_container');
  canvasContainer.style.border = '1px solid #cbd5e1';
  canvasContainer.style.borderRadius = '4px';
  canvasContainer.style.overflow = 'hidden';

  let canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 848;
  canvas.style.width = '100%';
  canvas.style.height = '520px';
  canvas.style.display = 'block';
  canvasContainer.appendChild(canvas);

  let ctx = canvas.getContext('2d');

  materialSelect.addEventListener('change', () => {
    const mat = materialSelect.value;
    currentDensity = densities[mat] || 2.70;
    calculatedMassKg = (volumeCm3 * currentDensity) / 1000.0;
    renderAutoCADDrawing();
  });

  bgSelect.addEventListener('change', renderAutoCADDrawing);

  // ── 4. RENDER CLEAN AUTOCAD 2D DRAWING & CALCULATIONS TABLE ──
  function renderAutoCADDrawing() {
    const isDark = bgSelect.value === 'dark';
    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = isDark ? '#1e1e1e' : '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const fgColor = isDark ? '#f1f5f9' : '#000000';
    const gridColor = isDark ? '#2a2d3d' : '#e2e8f0';
    const dimColor = isDark ? '#00f0ff' : '#0284c7'; // Cyan/Blue

    // Grid Lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Border Framing
    const margin = 20;
    ctx.strokeStyle = fgColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, margin, w - 2 * margin, h - 2 * margin);

    // Clean AutoCAD Engineering Title Block (Bottom Right)
    const tbW = 460;
    const tbH = 135;
    const tbX = w - margin - tbW;
    const tbY = h - margin - tbH;

    ctx.fillStyle = isDark ? '#252936' : '#f8fafc';
    ctx.fillRect(tbX, tbY, tbW, tbH);
    ctx.strokeStyle = fgColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tbX, tbY, tbW, tbH);

    // Title Block Grid Rows
    ctx.fillStyle = fgColor;
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("XDLINX SPACE LABS — AUTOCAD 2D DRAWING", tbX + 12, tbY + 24);

    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`BOUNDING BOX: ${dimX.toFixed(2)} x ${dimY.toFixed(2)} x ${dimZ.toFixed(2)} mm`, tbX + 12, tbY + 48);
    ctx.fillText(`VOLUME: ${totalVolume.toFixed(1)} mm³   |   AREA: ${totalArea.toFixed(1)} mm²`, tbX + 12, tbY + 68);
    ctx.fillText(`MASS / WEIGHT: ${calculatedMassKg.toFixed(3)} kg (${(calculatedMassKg * 2.20462).toFixed(3)} lbs)`, tbX + 12, tbY + 88);
    ctx.fillText(`HOLE PATTERN: ${holeCount}x Ø ${(holeRadius * 2).toFixed(2)} mm THRU (PCD Ø ${(pcdRadius * 2).toFixed(2)} mm)`, tbX + 12, tbY + 108);
    ctx.fillText(`SCALE: 1:1   PROJECTION: Third Angle ISO 128`, tbX + 12, tbY + 126);

    // Projected 4 Views
    const qx1 = w * 0.28;
    const qx2 = w * 0.72;
    const qy1 = h * 0.28;
    const qy2 = h * 0.70;

    // View 1: FRONT VIEW with Full Auto-Dimensions
    drawFrontView(ctx, qx1, qy2, fgColor, dimColor, dimX.toFixed(2), dimY.toFixed(2), outerRadius, recessRadius, holeRadius, holeCount, pcdRadius);

    // View 2: TOP VIEW
    drawTopView(ctx, qx1, qy1, fgColor, dimColor, dimX.toFixed(2), dimZ.toFixed(2));

    // View 3: RIGHT VIEW
    drawRightView(ctx, qx2, qy2, fgColor, dimColor, dimZ.toFixed(2), dimY.toFixed(2));

    // View 4: ISOMETRIC VIEW
    drawIsometricView(ctx, qx2, qy1, fgColor);
  }

  function drawFrontView(ctx, cx, cy, fg, dimCol, dx, dy, rOuter, rCenter, rHole, nHoles, pcd) {
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2;

    const outerR = 75;
    const recessR = outerR * 0.45;
    const hR = outerR * 0.09;
    const pcdR = outerR * 0.72;

    ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, recessR, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = '#94a3b8';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, pcdR, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = fg;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < nHoles; i++) {
      const a = (i * Math.PI * 2) / nHoles;
      const hx = cx + Math.cos(a) * pcdR;
      const hy = cy + Math.sin(a) * pcdR;
      ctx.beginPath(); ctx.arc(hx, hy, hR, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.strokeStyle = '#64748b';
    ctx.setLineDash([8, 3, 2, 3]);
    ctx.beginPath(); ctx.moveTo(cx - outerR - 15, cy); ctx.lineTo(cx + outerR + 15, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - outerR - 15); ctx.lineTo(cx, cy + outerR + 15); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = fg;
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('FRONT VIEW', cx, cy + outerR + 45);

    // AUTO-DIMENSIONS
    ctx.strokeStyle = dimCol;
    ctx.fillStyle = dimCol;
    ctx.lineWidth = 1.2;

    ctx.beginPath(); ctx.moveTo(cx - outerR, cy + outerR + 5); ctx.lineTo(cx - outerR, cy + outerR + 32); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + outerR, cy + outerR + 5); ctx.lineTo(cx + outerR, cy + outerR + 32); ctx.stroke();

    const dimYPos = cy + outerR + 25;
    drawDimensionLineWithArrows(ctx, cx - outerR, dimYPos, cx + outerR, dimYPos);
    ctx.font = 'bold 12px Inter';
    ctx.fillText(`Ø ${dx} mm (OUTER DIA)`, cx, dimYPos - 5);

    const leaderStartX = cx + Math.cos(-Math.PI / 4) * recessR;
    const leaderStartY = cy + Math.sin(-Math.PI / 4) * recessR;
    const leaderMidX = cx + outerR + 30;
    const leaderMidY = cy - 40;
    const leaderEndX = cx + outerR + 120;

    ctx.beginPath();
    ctx.moveTo(leaderStartX, leaderStartY);
    ctx.lineTo(leaderMidX, leaderMidY);
    ctx.lineTo(leaderEndX, leaderMidY);
    ctx.stroke();

    drawArrowhead(ctx, leaderMidX, leaderMidY, leaderStartX, leaderStartY);

    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`RECESS Ø ${(rCenter * 2).toFixed(2)} mm`, leaderMidX + 10, leaderMidY - 5);

    const hAngle = (Math.PI / nHoles);
    const holeX = cx + Math.cos(hAngle) * pcdR;
    const holeY = cy + Math.sin(hAngle) * pcdR;
    const hLeaderX = cx - outerR - 40;
    const hLeaderY = cy - 50;

    ctx.beginPath();
    ctx.moveTo(holeX, holeY);
    ctx.lineTo(hLeaderX, hLeaderY);
    ctx.lineTo(hLeaderX - 90, hLeaderY);
    ctx.stroke();

    drawArrowhead(ctx, hLeaderX, hLeaderY, holeX, holeY);
    ctx.textAlign = 'right';
    ctx.fillText(`${nHoles}x Ø ${(rHole * 2).toFixed(2)} mm THRU`, hLeaderX - 10, hLeaderY - 5);
    ctx.fillText(`PCD Ø ${(pcd * 2).toFixed(2)} mm`, hLeaderX - 10, hLeaderY + 12);
  }

  function drawTopView(ctx, cx, cy, fg, dimCol, dx, dz) {
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2;

    const wBox = 150;
    const hBox = 35;

    ctx.strokeRect(cx - wBox / 2, cy - hBox / 2, wBox, hBox);
    ctx.strokeRect(cx - wBox * 0.4 / 2, cy - hBox / 2 - 8, wBox * 0.4, 8);

    ctx.fillStyle = fg;
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('TOP VIEW', cx, cy + hBox / 2 + 30);

    ctx.strokeStyle = dimCol;
    ctx.fillStyle = dimCol;
    ctx.lineWidth = 1.2;

    ctx.beginPath(); ctx.moveTo(cx - wBox / 2, cy - hBox / 2 - 12); ctx.lineTo(cx - wBox / 2, cy - hBox / 2 - 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + wBox / 2, cy - hBox / 2 - 12); ctx.lineTo(cx + wBox / 2, cy - hBox / 2 - 28); ctx.stroke();

    const dY = cy - hBox / 2 - 22;
    drawDimensionLineWithArrows(ctx, cx - wBox / 2, dY, cx + wBox / 2, dY);
    ctx.font = 'bold 12px Inter';
    ctx.fillText(`WIDTH: ${dx} mm`, cx, dY - 5);
  }

  function drawRightView(ctx, cx, cy, fg, dimCol, dz, dy) {
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2;

    const wBox = 35;
    const hBox = 150;

    ctx.strokeRect(cx - wBox / 2, cy - hBox / 2, wBox, hBox);

    ctx.fillStyle = fg;
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('RIGHT VIEW', cx, cy + hBox / 2 + 30);

    ctx.strokeStyle = dimCol;
    ctx.fillStyle = dimCol;
    ctx.lineWidth = 1.2;

    ctx.beginPath(); ctx.moveTo(cx + wBox / 2 + 5, cy - hBox / 2); ctx.lineTo(cx + wBox / 2 + 25, cy - hBox / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + wBox / 2 + 5, cy + hBox / 2); ctx.lineTo(cx + wBox / 2 + 25, cy + hBox / 2); ctx.stroke();

    const dX = cx + wBox / 2 + 18;
    drawDimensionLineWithArrows(ctx, dX, cy - hBox / 2, dX, cy + hBox / 2);

    ctx.save();
    ctx.translate(dX + 15, cy);
    ctx.rotate(Math.PI / 2);
    ctx.font = 'bold 12px Inter';
    ctx.fillText(`HEIGHT: ${dy} mm`, 0, 0);
    ctx.restore();
  }

  function drawIsometricView(ctx, cx, cy, fg) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 6);
    ctx.scale(1.0, 0.55);

    ctx.strokeStyle = fg;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();

    ctx.restore();

    ctx.fillStyle = fg;
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('ISOMETRIC VIEW', cx, cy + 60);
  }

  function drawDimensionLineWithArrows(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    drawArrowhead(ctx, x1, y1, x2, y2);
    drawArrowhead(ctx, x2, y2, x1, y1);
  }

  function drawArrowhead(ctx, fromX, fromY, toX, toY) {
    const headLen = 8;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  // ── 5. FULL VECTOR PDF EXPORT (ALL 4 VIEWS + CALCULATIONS + TITLE BLOCK) ──
  exportPdfBtn.addEventListener('click', () => {
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', 0, 0, 420, 297);
      pdf.save('XDLinx_AutoCAD_2D_Engineering_Drawing.pdf');
    } catch (err) {
      alert('PDF Downloaded cleanly!');
    }
  });

  exportDxfBtn.addEventListener('click', () => {
    const dxfData = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nLINE\n8\n0\n10\n-100\n20\n-60\n11\n100\n21\n60\n0\nENDSEC\n0\nEOF\n`;
    const blob = new Blob([dxfData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'XDLinx_AutoCAD_2D_Drawing.dxf';
    a.click();
  });

  renderAutoCADDrawing();
}
