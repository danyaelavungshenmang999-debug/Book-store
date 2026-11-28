import { jsPDF } from 'jspdf';
import { Order } from '../types';
import { formatDateTime, formatMMK } from './api';
import { PAYMENT_LABELS } from '../components/PaymentLogo';

export function downloadOrderReceiptPdf(order: Order): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Brand Header
  doc.setFillColor(15, 81, 50); // BookHaven Forest Emerald (#0F5132)
  doc.rect(margin, y, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('BookHaven Myanmar', margin + 6, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Pansodan Street, Kyauktada Township, Yangon', margin + 6, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DIGITAL ORDER RECEIPT', pageWidth - margin - 6, y + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(order.orderNumber, pageWidth - margin - 6, y + 17, { align: 'right' });

  y += 34;

  // Order Metadata & Status Strip
  doc.setTextColor(24, 24, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Order Date:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDateTime(order.createdAt), margin + 26, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Order Status:', pageWidth / 2 + 4, y);
  doc.setFont('helvetica', 'normal');
  doc.text(order.orderStatus, pageWidth / 2 + 30, y);

  y += 7;
  doc.setDrawColor(229, 224, 216);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Two-Column Customer Shipping & Payment Summary
  const colWidth = (contentWidth - 8) / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 81, 50);
  doc.text('SHIPPING ADDRESS', margin, y);
  doc.text('PAYMENT DETAILS', margin + colWidth + 8, y);
  y += 6;

  doc.setTextColor(24, 24, 27);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(order.shippingAddress.fullName, margin, y);

  const paymentLabel = PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod;
  doc.text(paymentLabel, margin + colWidth + 8, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(82, 82, 91);

  const addressLines = [
    order.shippingAddress.phone,
    ...doc.splitTextToSize(
      `${order.shippingAddress.streetAddress}, ${order.shippingAddress.township}`,
      colWidth
    ),
    `${order.shippingAddress.city} ${order.shippingAddress.postalCode || ''}`.trim(),
  ];

  const paymentLines = [
    `Status: ${order.isPaid ? 'Paid' : 'Unpaid'}`,
    `Verification: ${order.paymentDetails.verificationStatus}`,
  ];
  if (order.paymentDetails.transactionId) {
    paymentLines.push(`Transaction ID: ${order.paymentDetails.transactionId}`);
  }
  if (order.paymentDetails.rejectionReason) {
    paymentLines.push(
      ...doc.splitTextToSize(`Note: ${order.paymentDetails.rejectionReason}`, colWidth)
    );
  }

  const maxInfoRows = Math.max(addressLines.length, paymentLines.length);
  for (let i = 0; i < maxInfoRows; i++) {
    if (addressLines[i]) {
      doc.text(String(addressLines[i]), margin, y + i * 5);
    }
    if (paymentLines[i]) {
      doc.text(String(paymentLines[i]), margin + colWidth + 8, y + i * 5);
    }
  }

  y += maxInfoRows * 5 + 8;

  // Items Table Header
  doc.setFillColor(243, 241, 236);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setTextColor(24, 24, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  const qtyX = margin + contentWidth - 62;
  const unitX = margin + contentWidth - 34;
  const totalX = margin + contentWidth - 4;

  doc.text('BOOK TITLE & AUTHOR', margin + 4, y + 6);
  doc.text('QTY', qtyX, y + 6, { align: 'right' });
  doc.text('UNIT PRICE', unitX, y + 6, { align: 'right' });
  doc.text('AMOUNT', totalX, y + 6, { align: 'right' });

  y += 14;

  // Line Items
  doc.setFont('helvetica', 'normal');
  for (const item of order.orderItems) {
    const titleLines = doc.splitTextToSize(item.title, contentWidth - 78) as string[];
    const rowHeight = Math.max(11, titleLines.length * 4.5 + 6);

    if (y + rowHeight > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(24, 24, 27);
    doc.text(titleLines, margin + 4, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(113, 113, 122);
    doc.text(item.author, margin + 4, y + titleLines.length * 4.5 + 0.5);

    doc.setFontSize(9.5);
    doc.setTextColor(24, 24, 27);
    doc.text(String(item.qty), qtyX, y, { align: 'right' });
    doc.text(formatMMK(item.price), unitX, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatMMK(item.price * item.qty), totalX, y, { align: 'right' });

    y += rowHeight;
    doc.setDrawColor(239, 236, 229);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
    y += 3;
  }

  y += 4;

  // Totals Summary Block
  const summaryLabelX = pageWidth - margin - 52;
  const summaryValueX = pageWidth - margin - 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(82, 82, 91);

  doc.text('Subtotal', summaryLabelX, y);
  doc.text(formatMMK(order.subtotal), summaryValueX, y, { align: 'right' });
  y += 6;

  if (order.discountAmount > 0) {
    doc.setTextColor(15, 81, 50);
    doc.text(`Discount (${order.couponCode || 'Promo'})`, summaryLabelX, y);
    doc.text(`- ${formatMMK(order.discountAmount)}`, summaryValueX, y, { align: 'right' });
    y += 6;
    doc.setTextColor(82, 82, 91);
  }

  doc.text('Courier Delivery', summaryLabelX, y);
  doc.text(
    order.deliveryFee === 0 ? 'Free' : formatMMK(order.deliveryFee),
    summaryValueX,
    y,
    { align: 'right' }
  );
  y += 4;

  doc.setDrawColor(212, 208, 199);
  doc.line(summaryLabelX - 4, y, pageWidth - margin, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(24, 24, 27);
  doc.text('Total', summaryLabelX, y);
  doc.text(formatMMK(order.totalPrice), summaryValueX, y, { align: 'right' });

  // Footer
  const footerY = 278;
  doc.setDrawColor(229, 224, 216);
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text(
    `Generated on ${formatDateTime(new Date().toISOString())} · Thank you for reading with BookHaven Myanmar.`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.save(`BookHaven-Receipt-${order.orderNumber}.pdf`);
}
