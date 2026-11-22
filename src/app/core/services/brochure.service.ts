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
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(property.title, 14, 46);

    doc.setTextColor(30, 142, 62); // #1E8E3E Green
    doc.setFontSize(13);
    const formattedPrice = property.price >= 10000000
      ? `₹ ${(property.price / 10000000).toFixed(2)} Crores`
      : `₹ ${(property.price / 100000).toFixed(2)} Lakhs`;
    doc.text(`Price: ${formattedPrice} ${property.negotiable ? '(Negotiable)' : ''}`, 14, 54);

    // 3. Dynamic Property Type Specifications Table
    const specsData: string[][] = [];

    if (property.propertyType === 'plot') {
      specsData.push(
        ['Property Type', 'RESIDENTIAL PLOT', 'Listing Type', property.listingType.toUpperCase()],
        ['Plot Area', `${property.area} ${property.areaUnit.toUpperCase()}`, 'Dimensions', property.plotDetails?.dimensions || 'Contact Advisor'],
        ['Road Width', property.plotDetails?.roadWidthFt ? `${property.plotDetails.roadWidthFt} Ft Wide` : '30 Ft Wide', 'Approval Status', property.plotDetails?.approvalStatus || 'DTCP / RERA Approved'],
        ['Corner Plot', property.plotDetails?.isCornerPlot ? 'Yes (2 Sides Open)' : 'Standard Plot', 'Boundary Wall', property.plotDetails?.hasBoundaryWall ? 'Constructed' : 'Fenced'],
        ['Locality', `${property.location.locality}, ${property.location.city}`, 'Gated Layout', property.plotDetails?.isGatedLayout ? 'Yes (Secure Community)' : 'Individual Plot']
      );
    } else if (property.propertyType === 'villa') {
      specsData.push(
        ['Property Type', 'LUXURY VILLA', 'Listing Type', property.listingType.toUpperCase()],
        ['Built-up Area', `${property.area} ${property.areaUnit.toUpperCase()}`, 'Plot Area', property.villaDetails?.plotArea ? `${property.villaDetails.plotArea} Sq.ft` : 'Independent Land'],
        ['Floors / Levels', property.villaDetails?.floors || 'G+1 Duplex', 'Facing / Vastu', property.facing || property.villaDetails?.facing || 'East Facing'],
        ['Bedrooms / Baths', `${property.bhk || property.villaDetails?.bedrooms || 3} BHK | ${property.bathrooms || property.villaDetails?.bathrooms || 3} Baths`, 'Car Parking', property.villaDetails?.carParking ? `${property.villaDetails.carParking} Covered Spots` : 'Covered Parking'],
        ['Private Garden', property.villaDetails?.hasGarden ? 'Yes (Landscaped)' : 'Available', 'Furnishing', (property.villaDetails?.furnishing || 'Semi-Furnished').toUpperCase()]
      );
    } else if (property.propertyType === 'apartment' || property.propertyType === 'penthouse') {
      specsData.push(
        ['Property Type', property.propertyType.toUpperCase(), 'Listing Type', property.listingType.toUpperCase()],
        ['Super Built-up', `${property.area} ${property.areaUnit.toUpperCase()}`, 'Floor Number', property.apartmentDetails?.floorNumber ? `${property.apartmentDetails.floorNumber} of ${property.apartmentDetails.totalFloors || '—'}` : 'Mid Floor'],
        ['Configuration', `${property.bhk || '3 BHK'} (${property.bathrooms || 2} Bathrooms)`, 'Facing / Vastu', property.facing || 'East Facing'],
        ['Balconies', property.apartmentDetails?.balconies ? `${property.apartmentDetails.balconies} Balconies` : 'Yes', 'UDS (Land Share)', property.apartmentDetails?.udsSqFt ? `${property.apartmentDetails.udsSqFt} Sq.ft` : 'Included'],
        ['Locality', `${property.location.locality}, ${property.location.city}`, 'Maintenance', property.apartmentDetails?.monthlyMaintenance ? `₹ ${property.apartmentDetails.monthlyMaintenance}/mo` : 'Nominal']
      );
    } else {
      specsData.push(
        ['Property Type', property.propertyType.toUpperCase(), 'Listing Type', property.listingType.toUpperCase()],
        ['Total Area', `${property.area} ${property.areaUnit.toUpperCase()}`, 'Facing', property.facing || 'Main Road Facing'],
        ['Configuration', property.bhk || 'Commercial Space', 'Bathrooms', property.bathrooms ? String(property.bathrooms) : 'Common'],
        ['Locality', `${property.location.locality}, ${property.location.city}`, 'Pincode', property.location.pincode || '—']
      );
    }

    autoTable(doc, {
      startY: 60,
      head: [['Specification', 'Details', 'Specification', 'Details']],
      body: specsData,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [26, 115, 232], textColor: [255, 255, 255] }
    });

    // 4. On-Site Infrastructure & Services Checklist
    let currentY = (doc as any).lastAutoTable.finalY + 8;
    const infraList = property.infrastructure && property.infrastructure.length > 0
      ? property.infrastructure
      : (property.amenities && property.amenities.length > 0
          ? property.amenities
          : ['24/7 Gated Security', 'Metro Water & Borewell', '30ft/40ft Wide Blacktop Road', 'Underground Sewage & Drainage', '100% DG Power Backup', 'Street Lighting & Tree Avenue']);

    doc.setTextColor(32, 33, 36);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('On-Site Infrastructure & Community Services:', 14, currentY);

    // Group into 2 columns
    const half = Math.ceil(infraList.length / 2);
    const infraCol1 = infraList.slice(0, half).map(item => `• ${item}`);
    const infraCol2 = infraList.slice(half).map(item => `• ${item}`);
    const infraTableData: string[][] = [];
    for (let i = 0; i < Math.max(infraCol1.length, infraCol2.length); i++) {
      infraTableData.push([infraCol1[i] || '', infraCol2[i] || '']);
    }

    autoTable(doc, {
      startY: currentY + 3,
      body: infraTableData,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 1.8, textColor: [32, 33, 36] }
    });

    // 5. Vicinity & Key Distances (Location Intel)
    currentY = (doc as any).lastAutoTable.finalY + 6;
    if (property.vicinity) {
      doc.setTextColor(32, 33, 36);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Location Vicinity & Connectivity:', 14, currentY);

      const vicinityData: string[][] = [];
      if (property.vicinity.metroDistance) vicinityData.push(['Nearest Metro / Rail', property.vicinity.metroDistance]);
      if (property.vicinity.highwayDistance) vicinityData.push(['Highway / IT Corridor', property.vicinity.highwayDistance]);
      if (property.vicinity.schoolDistance) vicinityData.push(['Schools & Colleges', property.vicinity.schoolDistance]);
      if (property.vicinity.hospitalDistance) vicinityData.push(['Hospitals & Healthcare', property.vicinity.hospitalDistance]);
      if (property.vicinity.airportDistance) vicinityData.push(['International Airport', property.vicinity.airportDistance]);

      if (vicinityData.length > 0) {
        autoTable(doc, {
          startY: currentY + 3,
          body: vicinityData,
          theme: 'striped',
          styles: { fontSize: 8.5, cellPadding: 2, textColor: [50, 50, 50] }
        });
        currentY = (doc as any).lastAutoTable.finalY + 6;
      }
    }

    // 6. Highlights & Description
    doc.setTextColor(32, 33, 36);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Property Overview & Investment Highlights:', 14, currentY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(95, 99, 104);
    const splitDesc = doc.splitTextToSize(property.description || `${property.title} located in prime ${property.location.locality}, ${property.location.city}. Excellent appreciation potential and ready for immediate possession/registration.`, 182);
    doc.text(splitDesc, 14, currentY + 5);

    const mapLocationUrl = property.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.location.address || ''} ${property.location.locality}, ${property.location.city}`.trim())}`;
    doc.setTextColor(26, 115, 232);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Google Maps Location: ${mapLocationUrl}`, 14, currentY + 5 + (splitDesc.length * 4.5) + 4);

    // 7. Direct Agent Contact Footer (Confidential - Masks Owner Contact)
    const footerY = 270;
    doc.setFillColor(248, 249, 250);
    doc.rect(0, footerY, 210, 27, 'F');

    doc.setTextColor(26, 115, 232);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('For VIP Site Inspection, Booking & Documentation:', 14, footerY + 7);

    doc.setTextColor(32, 33, 36);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const agentName = property.assignedAgentName || agent?.displayName || 'Principal Realty Advisor';
    const agentPhone = agent?.phoneNumber || tenant.phone;
    doc.text(`Relationship Advisor: ${agentName} | Call / WhatsApp: ${agentPhone}`, 14, footerY + 15);
    doc.text(`Official Brokerage: ${tenant.agencyName} (RERA: ${tenant.reraNumber || 'Verified'})`, 14, footerY + 21);

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

  /**
   * Generates a beautifully formatted WhatsApp pitch message
   */
  generateWhatsAppPitch(property: Property): string {
    const tenant = this.tenantService.activeTenant();
    const agent = this.auth.currentUser();

    const formattedPrice = property.price >= 10000000
      ? `₹ ${(property.price / 10000000).toFixed(2)} Crores`
      : `₹ ${(property.price / 100000).toFixed(2)} Lakhs`;

    let typeDetails = '';
    if (property.propertyType === 'plot') {
      typeDetails = `*Dimensions:* ${property.plotDetails?.dimensions || `${property.area} ${property.areaUnit}`}\n` +
        `*Road Width:* ${property.plotDetails?.roadWidthFt ? `${property.plotDetails.roadWidthFt} Ft Road` : 'Wide Access Road'}\n` +
        `*Approval:* ${property.plotDetails?.approvalStatus || 'DTCP / RERA Approved'}\n` +
        `*Corner Plot:* ${property.plotDetails?.isCornerPlot ? 'Yes (2-side road)' : 'Standard Plot'}`;
    } else if (property.propertyType === 'villa') {
      typeDetails = `*Configuration:* ${property.bhk || property.villaDetails?.bedrooms || 3} BHK Luxury Villa\n` +
        `*Floors:* ${property.villaDetails?.floors || 'G+1 Duplex'}\n` +
        `*Car Parking:* ${property.villaDetails?.carParking ? `${property.villaDetails.carParking} Covered Slots` : 'Available'}\n` +
        `*Facing:* ${property.facing || property.villaDetails?.facing || 'East Facing'}`;
    } else if (property.propertyType === 'apartment') {
      typeDetails = `*Configuration:* ${property.bhk || '3 BHK'} Apartment\n` +
        `*Floor:* ${property.apartmentDetails?.floorNumber ? `Floor ${property.apartmentDetails.floorNumber} of ${property.apartmentDetails.totalFloors || '—'}` : 'Mid Floor'}\n` +
        `*Facing:* ${property.facing || 'East'}\n` +
        `*UDS:* ${property.apartmentDetails?.udsSqFt ? `${property.apartmentDetails.udsSqFt} Sq.ft` : 'Substantial'}`;
    }

    const services = (property.infrastructure && property.infrastructure.length > 0)
      ? property.infrastructure.slice(0, 4).join(', ')
      : '24/7 Security, Metro Water, Wide Blacktop Road, Power Backup';

    const mapsLine = property.mapsUrl
      ? `\n*Google Maps Location:* ${property.mapsUrl}`
      : `\n*Google Maps Location:* https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.location.address || ''} ${property.location.locality}, ${property.location.city}`.trim())}`;

    const agentName = property.assignedAgentName || agent?.displayName || 'Senior Property Consultant';
    const agentPhone = agent?.phoneNumber || tenant.phone;

    return `*VERIFIED PROPERTY OPPORTUNITY*\n\n` +
      `*${property.title}*\n` +
      `*Location:* ${property.location.locality}, ${property.location.city}${mapsLine}\n` +
      `*Price:* ${formattedPrice} ${property.negotiable ? '(Negotiable)' : ''}\n` +
      `*Area:* ${property.area} ${property.areaUnit.toUpperCase()}\n` +
      (typeDetails ? `\n${typeDetails}\n` : '') +
      `\n*On-Site Services:* ${services}\n` +
      `\n*Overview:* ${property.description || 'Premium investment option ready for immediate site inspection.'}\n\n` +
      `*Book Site Visit / Inquiries:*\n` +
      `*${agentName}* — ${agentPhone}\n` +
      `*${tenant.agencyName}* (RERA: ${tenant.reraNumber || 'Verified'})`;
  }

  /**
   * Opens WhatsApp with pre-filled pitch
   */
  shareToWhatsApp(property: Property): void {
    const pitch = this.generateWhatsAppPitch(property);
    const url = `https://wa.me/?text=${encodeURIComponent(pitch)}`;
    window.open(url, '_blank');
  }

  /**
   * Copies formatted pitch text to clipboard
   */
  async copyPitch(property: Property): Promise<boolean> {
    const pitch = this.generateWhatsAppPitch(property);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pitch);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Native device share sheet fallback
   */
  async shareNative(property: Property): Promise<void> {
    const pitch = this.generateWhatsAppPitch(property);
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: property.title,
          text: pitch,
          dialogTitle: 'Share Property Details'
        });
      } catch (err) {
        console.warn('Native share failed:', err);
      }
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: pitch
        });
      } catch (err) {
        console.warn('Web share failed:', err);
      }
    } else {
      await this.copyPitch(property);
    }
  }
}
