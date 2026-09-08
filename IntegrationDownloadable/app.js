(function () {
  'use strict';

  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const LOGO_PATH = '../Integration/logo.png';
  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;
  const MARGIN = 48;
  const PRIMARY = rgb(0.105, 0.369, 0.18);
  const PRIMARY_DARK = rgb(0.051, 0.231, 0.102);
  const LIGHT_GREEN = rgb(0.91, 0.96, 0.92);
  const TEXT = rgb(0.102, 0.18, 0.102);
  const MUTED = rgb(0.373, 0.451, 0.376);
  const BORDER = rgb(0.78, 0.84, 0.78);
  const INK = rgb(0.0, 0.18, 0.65);

  function textVal(id) {
    return (document.getElementById(id)?.value || '').trim();
  }

  function radioVal(name) {
    const el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function getFormData() {
    return {
      clientName: textVal('clientName'),
      clientAddress: textVal('clientAddress'),
      clientContact: textVal('clientContact'),
      clientEmail: textVal('clientEmail'),
      emrName: textVal('emrName'),
      overallVolume: textVal('overallVolume'),
      patientVolume: textVal('patientVolume'),
      pcrVolume: textVal('pcrVolume'),
      volumeSummary: textVal('volumeSummary'),
      providerName: textVal('providerName'),
      npiNumber: textVal('npiNumber'),
      pocName: textVal('pocName'),
      pocEmail: textVal('pocEmail'),
      pocContact: textVal('pocContact'),
      integrationType: radioVal('integrationType'),
      salesName: textVal('salesName'),
      salesEmail: textVal('salesEmail'),
      salesContact: textVal('salesContact'),
      approvedName: textVal('approvedName'),
      approvedEmail: textVal('approvedEmail'),
      approvedContact: textVal('approvedContact'),
    };
  }

  async function embedLogo(pdfDoc) {
    try {
      const response = await fetch(LOGO_PATH);
      if (!response.ok) return null;
      const bytes = await response.arrayBuffer();
      return await pdfDoc.embedPng(bytes);
    } catch (e) {
      console.warn('Logo could not be embedded:', e.message);
      return null;
    }
  }

  function wrapText(text, font, size, maxWidth) {
    if (!text) return [''];
    const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
    const lines = [];
    let line = '';

    words.forEach(function (word) {
      const next = line ? line + ' ' + word : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    });

    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  function safeName(value, fallback) {
    return (value || fallback).replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') || fallback;
  }

  async function generatePDF() {
    const data = getFormData();
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const logo = await embedLogo(pdfDoc);
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    function drawHeader() {
      if (logo) {
        const logoWidth = 220;
        const logoHeight = logo.height * (logoWidth / logo.width);
        page.drawImage(logo, {
          x: (PAGE_WIDTH - logoWidth) / 2,
          y: y - logoHeight,
          width: logoWidth,
          height: logoHeight,
        });
        y -= logoHeight + 18;
      }

      const title = 'EMR Integration Request Form';
      const titleSize = 18;
      page.drawText(title, {
        x: (PAGE_WIDTH - bold.widthOfTextAtSize(title, titleSize)) / 2,
        y: y,
        size: titleSize,
        font: bold,
        color: PRIMARY_DARK,
      });
      y -= 18;

      const subtitle = 'Generated from the downloadable web form';
      page.drawText(subtitle, {
        x: (PAGE_WIDTH - font.widthOfTextAtSize(subtitle, 10)) / 2,
        y: y,
        size: 10,
        font: font,
        color: MUTED,
      });
      y -= 28;
    }

    function newPage() {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    function ensureSpace(height) {
      if (y - height < MARGIN) newPage();
    }

    function sectionTitle(title) {
      ensureSpace(42);
      page.drawRectangle({ x: MARGIN, y: y - 22, width: PAGE_WIDTH - (MARGIN * 2), height: 22, color: PRIMARY });
      page.drawText(title, { x: MARGIN + 10, y: y - 16, size: 11, font: bold, color: rgb(1, 1, 1) });
      y -= 34;
    }

    function field(label, value, options) {
      const width = options?.width || PAGE_WIDTH - (MARGIN * 2);
      const x = options?.x || MARGIN;
      const minHeight = options?.minHeight || 30;
      const labelSize = 8.5;
      const valueSize = 10.5;
      const lines = wrapText(value || ' ', bold, valueSize, width - 14);
      const boxHeight = Math.max(minHeight, 22 + (lines.length - 1) * 13);
      ensureSpace(boxHeight + 11);

      page.drawText(label, { x: x, y: y, size: labelSize, font: bold, color: TEXT });
      page.drawRectangle({ x: x, y: y - boxHeight, width: width, height: boxHeight - 9, borderColor: BORDER, borderWidth: 1 });
      lines.forEach(function (line, index) {
        if (!value) return;
        page.drawText(line, { x: x + 7, y: y - 22 - (index * 13), size: valueSize, font: bold, color: INK });
      });
      y -= boxHeight + 10;
    }

    function twoFields(leftLabel, leftValue, rightLabel, rightValue) {
      const gap = 14;
      const width = (PAGE_WIDTH - (MARGIN * 2) - gap) / 2;
      const topY = y;
      field(leftLabel, leftValue, { x: MARGIN, width: width });
      const afterLeft = y;
      y = topY;
      field(rightLabel, rightValue, { x: MARGIN + width + gap, width: width });
      y = Math.min(afterLeft, y);
    }

    function note(text) {
      const lines = wrapText(text, font, 9, PAGE_WIDTH - (MARGIN * 2) - 18);
      const height = 17 + lines.length * 12;
      ensureSpace(height + 8);
      page.drawRectangle({ x: MARGIN, y: y - height, width: PAGE_WIDTH - (MARGIN * 2), height: height, color: LIGHT_GREEN });
      page.drawRectangle({ x: MARGIN, y: y - height, width: 4, height: height, color: PRIMARY });
      lines.forEach(function (line, index) {
        page.drawText(line, { x: MARGIN + 12, y: y - 17 - (index * 12), size: 9, font: font, color: TEXT });
      });
      y -= height + 14;
    }

    function checkboxRow(label, selected, choices) {
      ensureSpace(38);
      page.drawText(label, { x: MARGIN, y: y, size: 8.5, font: bold, color: TEXT });
      let x = MARGIN;
      choices.forEach(function (choice) {
        page.drawRectangle({ x: x, y: y - 24, width: 11, height: 11, borderColor: BORDER, borderWidth: 1 });
        if (selected === choice) {
          page.drawText('X', { x: x + 2, y: y - 23, size: 9, font: bold, color: INK });
        }
        page.drawText(choice, { x: x + 17, y: y - 22, size: 10, font: font, color: TEXT });
        x += font.widthOfTextAtSize(choice, 10) + 48;
      });
      y -= 40;
    }

    drawHeader();

    sectionTitle('Client Information');
    field('Client Name', data.clientName);
    twoFields('Client Address', data.clientAddress, 'Contact Number', data.clientContact);
    field('Email ID', data.clientEmail);

    sectionTitle('EMR Details');
    field('EMR Name', data.emrName);
    note('If EMR is Practice Fusion: Account Number = First 3-5 characters of Client Name + 001. Example: Client Name TESTGO becomes Account Number testgo001.');

    sectionTitle('Expected Volume Summary');
    twoFields('Expected Overall Volume', data.overallVolume, 'Expected Patient Volume', data.patientVolume);
    field('Expected PCR Volume', data.pcrVolume);
    field('Summary', data.volumeSummary, { minHeight: 95 });

    sectionTitle('Provider Information');
    twoFields('Provider Name', data.providerName, 'NPI Number', data.npiNumber);

    sectionTitle('EMR Point of Contact');
    field('Name', data.pocName);
    twoFields('Email', data.pocEmail, 'Contact Number', data.pocContact);

    sectionTitle('Integration Type');
    checkboxRow('Select Integration Type', data.integrationType, ['Uni-Directional', 'Bi-Directional']);

    sectionTitle('Sales Rep Information');
    field('Name', data.salesName);
    twoFields('Email', data.salesEmail, 'Contact Number', data.salesContact);

    sectionTitle('Approved By');
    field('Name', data.approvedName);
    twoFields('Email', data.approvedEmail, 'Contact Number', data.approvedContact);

    const pages = pdfDoc.getPages();
    pages.forEach(function (pdfPage, index) {
      pdfPage.drawText('Page ' + (index + 1) + ' of ' + pages.length, {
        x: PAGE_WIDTH - MARGIN - 60,
        y: 24,
        size: 8,
        font: font,
        color: MUTED,
      });
      pdfPage.drawText('Generated: ' + new Date().toLocaleDateString(), {
        x: MARGIN,
        y: 24,
        size: 8,
        font: font,
        color: MUTED,
      });
    });

    const bytes = await pdfDoc.save();
    downloadPdf(bytes, 'EMR_Integration_' + safeName(data.clientName, 'Downloadable_Form') + '.pdf');
  }

  async function downloadPdf(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isTouchDevice = navigator.maxTouchPoints > 1;

    if ((isIOS || isTouchDevice) && navigator.canShare) {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename });
          return;
        } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }
    }

    if (isIOS || isTouchDevice) {
      const reader = new FileReader();
      reader.onload = function () {
        const newTab = window.open('', '_blank');
        if (newTab) {
          newTab.document.write(
            '<html><head><title>' + filename + '</title></head>' +
            '<body style="margin:0"><embed width="100%" height="100%" src="' +
            reader.result + '" type="application/pdf"></body></html>'
          );
          newTab.document.close();
        }
      };
      reader.readAsDataURL(blob);
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }

  function init() {
    const btn = document.getElementById('btnGenerate');
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      btn.textContent = 'Generating...';
      try {
        await generatePDF();
      } catch (e) {
        console.error(e);
        alert('Error generating PDF: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Download PDF';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
