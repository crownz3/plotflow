import { Injectable, inject } from '@angular/core';
import { Property } from '../models/models';
import { TenantService } from './tenant.service';
import { AuthService } from './auth.service';
import { PlatformConfigService } from './platform-config.service';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class BrochureService {
  private tenantService = inject(TenantService);
  private auth = inject(AuthService);
  private platformConfig = inject(PlatformConfigService);

  /**
   * Generates a branded, privacy-masked property PDF brochure client-side
   * and routes to the universal export handler (Android native share sheet vs Desktop browser download).
   */
  async generateAndShareBrochure(property: Property): Promise<void> {
    const tenant = this.tenantService.activeTenant();
    const agent = this.auth.currentUser();

    const doc = new jsPDF();

    // 1. Header Banner - Google Blue Material You
    doc.setFillColor(26, 115, 232); // #1A73E8
    doc.rect(0, 0, 210, 36, 'F');

    // Agency Brand Header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(tenant.agencyName || `${this.platformConfig.platformName()} Verified Realty`, 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`RERA: ${tenant.reraNumber || 'Verified Registration'} | Office: ${tenant.phone}`, 14, 24);
    doc.text(`Email: ${tenant.email} | Address: ${tenant.address}`, 14, 30);

    // 2. Property Main Title & Price
    doc.setTextColor(32, 33, 36); // #202124
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(property.title, 14, 48);

    doc.setTextColor(30, 142, 62); // #1E8E3E Green
    doc.setFontSize(14);
    const formattedPrice = property.price >= 10000000
      ? `₹ ${(property.price / 10000000).toFixed(2)} Crores`
      : `₹ ${(property.price / 100000).toFixed(2)} Lakhs`;
    doc.text(`Investment: ${formattedPrice} ${property.negotiable ? '(Negotiable)' : ''}`, 14, 56);

    // 3. Property Overview Specifications Table
    const specsData = [
      ['Property Type', property.propertyType.toUpperCase(), 'Listing Type', property.listingType.toUpperCase()],
      ['Super Built-up Area', `${property.area} ${property.areaUnit.toUpperCase()}`, 'Facing', property.facing || 'East'],
      ['Bedrooms (BHK)', property.bhk || '—', 'Bathrooms', property.bathrooms ? String(property.bathrooms) : '—'],
      ['Locality', `${property.location.locality}, ${property.location.city}`, 'Pincode', property.location.pincode || '—']
    ];

    autoTable(doc, {
      startY: 64,
      head: [['Specification', 'Details', 'Specification', 'Details']],
      body: specsData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [26, 115, 232], textColor: [255, 255, 255] }
    });

    // 4. Description & Highlights
    const currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setTextColor(32, 33, 36);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Highlights & Property Overview:', 14, currentY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(95, 99, 104);
    const splitDesc = doc.splitTextToSize(property.description, 182);
    doc.text(splitDesc, 14, currentY + 6);

    // 5. Amenities Grid
    const amenitiesY = currentY + 6 + (splitDesc.length * 5) + 6;
    doc.setTextColor(32, 33, 36);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Amenities & Infrastructure:', 14, amenitiesY);

    const amenitiesList = property.amenities.map(a => [ `✔ ${a}` ]);
    autoTable(doc, {
      startY: amenitiesY + 4,
      body: amenitiesList,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2, textColor: [32, 33, 36] }
    });

    // 6. Direct Agent Contact Footer (Guarantees Broker Protection - Masks Owner Contact)
    const footerY = 270;
    doc.setFillColor(248, 249, 250);
    doc.rect(0, footerY, 210, 27, 'F');

    doc.setTextColor(26, 115, 232);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('For VIP Site Inspection & Booking Details:', 14, footerY + 8);

    doc.setTextColor(32, 33, 36);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const agentName = property.assignedAgentName || agent?.displayName || 'Principal Realty Advisor';
    const agentPhone = agent?.phoneNumber || tenant.phone;
    doc.text(`Dedicated Relationship Advisor: ${agentName} | Call / WhatsApp: ${agentPhone}`, 14, footerY + 16);
    doc.text(`Confidential client representation by ${this.platformConfig.platformName()} Verified Brokerage Network.`, 14, footerY + 22);

    // Multi-Platform Universal Export
    const filename = `Brochure_${property.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_${Date.now()}.pdf`;

    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = doc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache
        });

        await Share.share({
          title: property.title,
          text: `Verified Property Brochure: ${property.title} - ${formattedPrice}`,
          url: savedFile.uri,
          dialogTitle: 'Share Property Brochure via WhatsApp or Email'
        });
      } catch (err) {
        console.warn('Native share failed, falling back to download:', err);
        doc.save(filename);
      }
    } else {
      // Desktop Browser direct download
      doc.save(filename);
    }
  }
}

