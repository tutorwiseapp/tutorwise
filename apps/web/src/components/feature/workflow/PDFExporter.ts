import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { ProcessNode } from './types';
import { NODE_TYPE_CONFIG } from './types';

interface ExportOptions {
  processName: string;
  processDescription: string;
  nodes: ProcessNode[];
  canvasElement: HTMLElement;
}

/**
 * Export the current workflow as a formatted PDF document.
 * Page 1: Title + canvas screenshot. Page 2+: Step details.
 */
export async function exportWorkflowPDF({
  processName,
  processDescription,
  nodes,
  canvasElement,
}: ExportOptions): Promise<void> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // --- Page 1: Title + Canvas Screenshot ---

  // Title
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(processName || 'Untitled Process', margin, margin + 10);

  // Description
  if (processDescription) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    const descLines = pdf.splitTextToSize(processDescription, contentWidth);
    pdf.text(descLines, margin, margin + 20);
  }

  // Metadata
  const metaY = processDescription ? margin + 30 : margin + 20;
  pdf.setFontSize(9);
  pdf.setTextColor(150, 150, 150);
  const stepCount = nodes.filter((n) => n.data.type !== 'trigger' && n.data.type !== 'end').length;
  pdf.text(
    `${stepCount} steps · Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    margin,
    metaY
  );

  // Canvas screenshot
  try {
    const dataUrl = await toPng(canvasElement, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });

    const imgAspect = img.width / img.height;
    const maxImgWidth = contentWidth;
    const maxImgHeight = pageHeight - metaY - margin - 10;
    let imgWidth = maxImgWidth;
    let imgHeight = imgWidth / imgAspect;

    if (imgHeight > maxImgHeight) {
      imgHeight = maxImgHeight;
      imgWidth = imgHeight * imgAspect;
    }

    const imgX = margin + (contentWidth - imgWidth) / 2;
    pdf.addImage(dataUrl, 'PNG', imgX, metaY + 8, imgWidth, imgHeight);
  } catch {
    // If screenshot fails, add placeholder text
    pdf.setFontSize(12);
    pdf.setTextColor(150, 150, 150);
    pdf.text('[Canvas screenshot unavailable]', margin, metaY + 20);
  }

  // --- Page 2+: Step Details ---
  const processNodes = nodes.filter(
    (n) => n.data.type !== 'trigger' && n.data.type !== 'end'
  );

  if (processNodes.length > 0) {
    pdf.addPage();
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Step Details', margin, margin + 10);

    let y = margin + 22;
    const lineHeight = 5;

    for (let i = 0; i < processNodes.length; i++) {
      const node = processNodes[i];
      const config = NODE_TYPE_CONFIG[node.data.type];

      // Check if we need a new page
      if (y > pageHeight - margin - 30) {
        pdf.addPage();
        y = margin + 10;
      }

      // Step header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${i + 1}. ${node.data.label}`, margin, y);

      // Type badge
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const typeLabel = config?.label || node.data.type;
      const labelWidth = pdf.getTextWidth(`${i + 1}. ${node.data.label}  `);
      pdf.text(`[${typeLabel}]`, margin + labelWidth + 4, y);
      y += lineHeight + 2;

      // Description
      if (node.data.description) {
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        const descLines = pdf.splitTextToSize(node.data.description, contentWidth - 10);
        pdf.text(descLines, margin + 4, y);
        y += descLines.length * lineHeight;
      }

      // Objective
      if (node.data.objective) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(80, 80, 80);
        pdf.text('Objective:', margin + 4, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(node.data.objective, margin + 28, y);
        y += lineHeight;
      }

      // Assignee + Duration
      const meta: string[] = [];
      if (node.data.assignee) meta.push(`Assignee: ${node.data.assignee}`);
      if (node.data.estimatedDuration) meta.push(`Duration: ${node.data.estimatedDuration}`);
      if (meta.length > 0) {
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.text(meta.join('  ·  '), margin + 4, y);
        y += lineHeight;
      }

      // Completion criteria
      if (node.data.completionCriteria && node.data.completionCriteria.length > 0) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(80, 80, 80);
        pdf.text('Completion Criteria:', margin + 4, y);
        y += lineHeight;
        pdf.setFont('helvetica', 'normal');
        for (const criteria of node.data.completionCriteria) {
          pdf.text(`• ${criteria}`, margin + 8, y);
          y += lineHeight;
        }
      }

      // Expected outputs
      if (node.data.expectedOutputs && node.data.expectedOutputs.length > 0) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(80, 80, 80);
        pdf.text('Expected Outputs:', margin + 4, y);
        y += lineHeight;
        pdf.setFont('helvetica', 'normal');
        for (const output of node.data.expectedOutputs) {
          pdf.text(`• ${output}`, margin + 8, y);
          y += lineHeight;
        }
      }

      // Separator
      y += 4;
      pdf.setDrawColor(230, 230, 230);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;
    }
  }

  // Save
  const fileName = (processName || 'process')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  pdf.save(`${fileName}.pdf`);
}
