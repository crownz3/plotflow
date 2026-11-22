import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../core/services/property.service';
import { PropertyAnalyticsService } from '../../core/services/property-analytics.service';
import { BrochureService } from '../../core/services/brochure.service';
import { PropertyCardComponent } from '../../shared/components/property-card/property-card.component';
import { StatusPillComponent } from '../../shared/components/status-pill/status-pill.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PropertyStatsDrawerComponent } from '../../shared/components/property-stats-drawer/property-stats-drawer.component';
import { DealModalComponent } from '../../shared/components/deal-modal/deal-modal.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { AreaFormatPipe } from '../../shared/pipes/area-format.pipe';
import { Property } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import imageCompression from 'browser-image-compression';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PropertyCardComponent,
    StatusPillComponent,
    EmptyStateComponent,
    PropertyStatsDrawerComponent,
    DealModalComponent,
    CurrencyFormatPipe,
    AreaFormatPipe
  ],
  templateUrl: './properties.component.html',
  styleUrl: './properties.component.scss'
})
export class PropertiesComponent {
  propertyService = inject(PropertyService);
  analyticsService = inject(PropertyAnalyticsService);
  brochureService = inject(BrochureService);
  auth = inject(AuthService);

  searchQuery = '';
  selectedType = signal<string>('all');
  selectedPropertyForStats = signal<Property | null>(null);
  detailedProperty = signal<Property | null>(null);
  shareModalProperty = signal<Property | null>(null);
  dealModalOpen = signal(false);
  dealModalProp?: Property;

  openAddModal = signal(false);
  editingProperty = signal<Property | null>(null);

  copiedNotice = signal(false);
  isGeneratingBrochure = signal(false);
  isCompressingImage = signal(false);

  // View Mode Toggle (Cards vs Table)
  readonly viewMode = signal<'cards' | 'table'>('cards');

  readonly availableInfrastructure = [
    '24/7 Gated Security & CCTV',
    'Metro Water Connection',
    'Copious Borewell Water',
    '30ft/40ft Wide Blacktop Road',
    'Underground Sewage Drainage',
    '100% DG Power Backup',
    'Clubhouse with Gym & Pool',
    'Children Play Area & Park',
    'Solar Street Lighting',
    'Rainwater Harvesting'
  ];

  newProp = this.getInitialNewProp();
  editForm = this.getInitialNewProp();

  getInitialNewProp() {
    return {
      title: '',
      description: '',
      propertyType: 'plot' as 'apartment' | 'villa' | 'plot' | 'commercial',
      listingType: 'sale' as 'sale' | 'rent',
      status: 'available' as 'available' | 'under_offer' | 'sold',
      price: 18000000,
      negotiable: true,
      area: 2400,
      areaUnit: 'sqft' as 'sqft' | 'cent' | 'acre' | 'ground' | 'guntha',
      locality: '',
      city: 'Chennai',
      address: '',
      pincode: '',
      mapsUrl: '',
      // Plot specific
      plotDimensions: '40 x 60',
      plotRoadWidth: 40,
      plotApproval: 'DTCP' as 'DTCP' | 'CMDA' | 'RERA' | 'Panchayat' | 'Patta' | 'Approved' | 'Other',
      isCornerPlot: false,
      hasBoundaryWall: false,
      isGatedLayout: true,
      soilType: 'Red Sand / Loamy',
      // Villa specific
      villaPlotArea: 2400,
      villaBuiltUpArea: 3200,
      villaFloors: 'G+1 Duplex',
      villaBedrooms: 4,
      villaBathrooms: 4,
      villaCarParking: 2,
      villaHasGarden: true,
      villaFacing: 'East',
      villaFurnishing: 'semi-furnished' as 'unfurnished' | 'semi-furnished' | 'fully-furnished',
      // Apartment specific
      aptFloorNumber: 5,
      aptTotalFloors: 12,
      aptBhk: '3BHK',
      aptBathrooms: 3,
      aptBalconies: 2,
      aptMonthlyMaintenance: 5500,
      aptUdsSqFt: 620,
      aptFacing: 'East',
      // On-Site Services & Infrastructure
      infrastructure: [
        '24/7 Gated Security & CCTV',
        'Metro Water Connection',
        '30ft/40ft Wide Blacktop Road'
      ] as string[],
      // Vicinity distances
      vicinityMetro: '',
      vicinityHighway: '',
      vicinitySchool: '',
      vicinityHospital: '',
      vicinityAirport: '',
      // Media
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80'
      ] as string[],
      videoTourUrl: '',
      customPhotoUrl: '',
      // Owner
      ownerName: '',
      ownerPhone: '',
      ownerExpectedPrice: 0,
      ownerPrivateNotes: ''
    };
  }

  toggleView(mode: 'cards' | 'table') {
    this.viewMode.set(mode);
  }

  resetFilters() {
    this.selectedType.set('all');
    this.searchQuery = '';
  }

  filteredProperties = computed(() => {
    let list = this.propertyService.tenantProperties();
    const type = this.selectedType();
    if (type !== 'all') {
      list = list.filter(p => p.propertyType === type);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.location.locality.toLowerCase().includes(q) ||
        p.location.city.toLowerCase().includes(q) ||
        (p.plotDetails?.approvalStatus && p.plotDetails.approvalStatus.toLowerCase().includes(q)) ||
        (p.bhk && p.bhk.toLowerCase().includes(q))
      );
    }
    return list;
  });

  // Toggle on-site infrastructure item
  toggleInfra(item: string, target: 'new' | 'edit') {
    const list = target === 'new' ? this.newProp.infrastructure : this.editForm.infrastructure;
    const index = list.indexOf(item);
    if (index >= 0) {
      list.splice(index, 1);
    } else {
      list.push(item);
    }
  }

  isInfraSelected(item: string, target: 'new' | 'edit'): boolean {
    const list = target === 'new' ? this.newProp.infrastructure : this.editForm.infrastructure;
    return list.includes(item);
  }

  // Quick photo upload with client-side compression
  async onFileSelected(event: Event, target: 'new' | 'edit') {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.isCompressingImage.set(true);
    try {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const compressedBlob = await imageCompression(file, {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 1600,
          useWebWorker: true
        });

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          if (target === 'new') {
            this.newProp.images.push(base64);
          } else {
            this.editForm.images.push(base64);
          }
        };
        reader.readAsDataURL(compressedBlob);
      }
    } catch (err) {
      console.warn('Image compression fallback:', err);
    } finally {
      this.isCompressingImage.set(false);
      input.value = '';
    }
  }

  addPhotoByUrl(target: 'new' | 'edit') {
    const form = target === 'new' ? this.newProp : this.editForm;
    if (!form.customPhotoUrl || !form.customPhotoUrl.trim()) return;
    form.images.push(form.customPhotoUrl.trim());
    form.customPhotoUrl = '';
  }

  removePhoto(index: number, target: 'new' | 'edit') {
    const form = target === 'new' ? this.newProp : this.editForm;
    form.images.splice(index, 1);
  }

  saveProperty() {
    if (!this.newProp.title.trim()) return;

    const propData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId: this.auth.activeTenantId(),
      title: this.newProp.title.trim(),
      description: this.newProp.description.trim() || `${this.newProp.title} in prime ${this.newProp.locality || this.newProp.city}.`,
      propertyType: this.newProp.propertyType,
      listingType: this.newProp.listingType,
      status: this.newProp.status,
      price: this.newProp.price,
      negotiable: this.newProp.negotiable,
      area: this.newProp.area,
      areaUnit: this.newProp.areaUnit,
      facing: this.newProp.propertyType === 'villa' ? this.newProp.villaFacing : (this.newProp.propertyType === 'apartment' ? this.newProp.aptFacing : 'East'),
      location: {
        address: this.newProp.address.trim() || `${this.newProp.locality}, ${this.newProp.city}`,
        city: this.newProp.city.trim(),
        locality: this.newProp.locality.trim() || this.newProp.city.trim(),
        pincode: this.newProp.pincode.trim()
      },
      mapsUrl: this.newProp.mapsUrl.trim() || undefined,
      infrastructure: [...this.newProp.infrastructure],
      amenities: [...this.newProp.infrastructure.slice(0, 5)],
      images: this.newProp.images.length > 0
        ? [...this.newProp.images]
        : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80'],
      media: {
        photos: [...this.newProp.images],
        videoTourUrl: this.newProp.videoTourUrl.trim() || undefined
      },
      ownerDetails: {
        name: this.newProp.ownerName.trim() || 'Verified Property Owner',
        phone: this.newProp.ownerPhone.trim() || '+91 98000 00000',
        expectedPrice: this.newProp.ownerExpectedPrice || this.newProp.price,
        privateNotes: this.newProp.ownerPrivateNotes.trim() || undefined
      },
      assignedAgentId: this.auth.currentUser()?.uid || 'user_agent_01',
      assignedAgentName: this.auth.currentUser()?.displayName || 'Senior Advisor',
      createdBy: this.auth.currentUser()?.uid || 'user_admin_01'
    };

    // Attach specialized details
    if (this.newProp.propertyType === 'plot') {
      propData.plotDetails = {
        dimensions: this.newProp.plotDimensions.trim(),
        roadWidthFt: this.newProp.plotRoadWidth,
        approvalStatus: this.newProp.plotApproval,
        isCornerPlot: this.newProp.isCornerPlot,
        hasBoundaryWall: this.newProp.hasBoundaryWall,
        isGatedLayout: this.newProp.isGatedLayout,
        soilType: this.newProp.soilType.trim()
      };
    } else if (this.newProp.propertyType === 'villa') {
      propData.bhk = `${this.newProp.villaBedrooms}BHK`;
      propData.bathrooms = this.newProp.villaBathrooms;
      propData.villaDetails = {
        plotArea: this.newProp.villaPlotArea,
        builtUpArea: this.newProp.villaBuiltUpArea,
        floors: this.newProp.villaFloors,
        bedrooms: this.newProp.villaBedrooms,
        bathrooms: this.newProp.villaBathrooms,
        carParking: this.newProp.villaCarParking,
        hasGarden: this.newProp.villaHasGarden,
        facing: this.newProp.villaFacing,
        furnishing: this.newProp.villaFurnishing
      };
    } else if (this.newProp.propertyType === 'apartment') {
      propData.bhk = this.newProp.aptBhk;
      propData.bathrooms = this.newProp.aptBathrooms;
      propData.apartmentDetails = {
        floorNumber: this.newProp.aptFloorNumber,
        totalFloors: this.newProp.aptTotalFloors,
        bhk: this.newProp.aptBhk,
        bathrooms: this.newProp.aptBathrooms,
        balconies: this.newProp.aptBalconies,
        monthlyMaintenance: this.newProp.aptMonthlyMaintenance,
        udsSqFt: this.newProp.aptUdsSqFt,
        facing: this.newProp.aptFacing
      };
    }

    // Vicinity
    propData.vicinity = {
      metroDistance: this.newProp.vicinityMetro.trim() || undefined,
      highwayDistance: this.newProp.vicinityHighway.trim() || undefined,
      schoolDistance: this.newProp.vicinitySchool.trim() || undefined,
      hospitalDistance: this.newProp.vicinityHospital.trim() || undefined,
      airportDistance: this.newProp.vicinityAirport.trim() || undefined
    };

    this.propertyService.addProperty(propData);
    this.openAddModal.set(false);
    this.newProp = this.getInitialNewProp();
  }

  startEditProperty(prop: Property) {
    this.editingProperty.set(prop);
    this.editForm = {
      ...this.getInitialNewProp(),
      title: prop.title,
      description: prop.description,
      propertyType: prop.propertyType as any,
      listingType: prop.listingType as any,
      status: prop.status as any,
      price: prop.price,
      negotiable: prop.negotiable,
      area: prop.area,
      areaUnit: prop.areaUnit,
      locality: prop.location.locality,
      city: prop.location.city,
      address: prop.location.address,
      pincode: prop.location.pincode || '',
      mapsUrl: prop.mapsUrl || '',
      infrastructure: prop.infrastructure ? [...prop.infrastructure] : [...prop.amenities],
      images: prop.images ? [...prop.images] : [],
      videoTourUrl: prop.media?.videoTourUrl || '',
      ownerName: prop.ownerDetails?.name || '',
      ownerPhone: prop.ownerDetails?.phone || '',
      ownerExpectedPrice: prop.ownerDetails?.expectedPrice || 0,
      ownerPrivateNotes: prop.ownerDetails?.privateNotes || '',
      // Plot
      plotDimensions: prop.plotDetails?.dimensions || '40 x 60',
      plotRoadWidth: prop.plotDetails?.roadWidthFt || 30,
      plotApproval: (prop.plotDetails?.approvalStatus as any) || 'DTCP',
      isCornerPlot: !!prop.plotDetails?.isCornerPlot,
      hasBoundaryWall: !!prop.plotDetails?.hasBoundaryWall,
      isGatedLayout: !!prop.plotDetails?.isGatedLayout,
      soilType: prop.plotDetails?.soilType || '',
      // Villa
      villaPlotArea: prop.villaDetails?.plotArea || 2000,
      villaBuiltUpArea: prop.villaDetails?.builtUpArea || 2800,
      villaFloors: prop.villaDetails?.floors || 'G+1',
      villaBedrooms: prop.villaDetails?.bedrooms || 3,
      villaBathrooms: prop.villaDetails?.bathrooms || 3,
      villaCarParking: prop.villaDetails?.carParking || 1,
      villaHasGarden: !!prop.villaDetails?.hasGarden,
      villaFacing: prop.villaDetails?.facing || 'East',
      villaFurnishing: prop.villaDetails?.furnishing || 'semi-furnished',
      // Apartment
      aptFloorNumber: prop.apartmentDetails?.floorNumber || 3,
      aptTotalFloors: prop.apartmentDetails?.totalFloors || 10,
      aptBhk: prop.apartmentDetails?.bhk || prop.bhk || '3BHK',
      aptBathrooms: prop.apartmentDetails?.bathrooms || prop.bathrooms || 2,
      aptBalconies: prop.apartmentDetails?.balconies || 1,
      aptMonthlyMaintenance: prop.apartmentDetails?.monthlyMaintenance || 4000,
      aptUdsSqFt: prop.apartmentDetails?.udsSqFt || 550,
      aptFacing: prop.apartmentDetails?.facing || 'East',
      // Vicinity
      vicinityMetro: prop.vicinity?.metroDistance || '',
      vicinityHighway: prop.vicinity?.highwayDistance || '',
      vicinitySchool: prop.vicinity?.schoolDistance || '',
      vicinityHospital: prop.vicinity?.hospitalDistance || '',
      vicinityAirport: prop.vicinity?.airportDistance || ''
    };
  }

  saveEditProperty() {
    const cur = this.editingProperty();
    if (!cur || !this.editForm.title.trim()) return;

    const updates: Partial<Property> = {
      title: this.editForm.title.trim(),
      description: this.editForm.description.trim(),
      propertyType: this.editForm.propertyType,
      listingType: this.editForm.listingType,
      status: this.editForm.status,
      price: this.editForm.price,
      negotiable: this.editForm.negotiable,
      area: this.editForm.area,
      areaUnit: this.editForm.areaUnit,
      location: {
        address: this.editForm.address.trim() || `${this.editForm.locality}, ${this.editForm.city}`,
        city: this.editForm.city.trim(),
        locality: this.editForm.locality.trim() || this.editForm.city.trim(),
        pincode: this.editForm.pincode.trim()
      },
      mapsUrl: this.editForm.mapsUrl.trim() || undefined,
      infrastructure: [...this.editForm.infrastructure],
      images: [...this.editForm.images],
      media: {
        photos: [...this.editForm.images],
        videoTourUrl: this.editForm.videoTourUrl.trim() || undefined
      },
      ownerDetails: {
        name: this.editForm.ownerName.trim() || cur.ownerDetails.name,
        phone: this.editForm.ownerPhone.trim() || cur.ownerDetails.phone,
        expectedPrice: this.editForm.ownerExpectedPrice,
        privateNotes: this.editForm.ownerPrivateNotes.trim()
      }
    };

    if (this.editForm.propertyType === 'plot') {
      updates.plotDetails = {
        dimensions: this.editForm.plotDimensions.trim(),
        roadWidthFt: this.editForm.plotRoadWidth,
        approvalStatus: this.editForm.plotApproval,
        isCornerPlot: this.editForm.isCornerPlot,
        hasBoundaryWall: this.editForm.hasBoundaryWall,
        isGatedLayout: this.editForm.isGatedLayout,
        soilType: this.editForm.soilType.trim()
      };
    } else if (this.editForm.propertyType === 'villa') {
      updates.bhk = `${this.editForm.villaBedrooms}BHK`;
      updates.bathrooms = this.editForm.villaBathrooms;
      updates.villaDetails = {
        plotArea: this.editForm.villaPlotArea,
        builtUpArea: this.editForm.villaBuiltUpArea,
        floors: this.editForm.villaFloors,
        bedrooms: this.editForm.villaBedrooms,
        bathrooms: this.editForm.villaBathrooms,
        carParking: this.editForm.villaCarParking,
        hasGarden: this.editForm.villaHasGarden,
        facing: this.editForm.villaFacing,
        furnishing: this.editForm.villaFurnishing
      };
    } else if (this.editForm.propertyType === 'apartment') {
      updates.bhk = this.editForm.aptBhk;
      updates.bathrooms = this.editForm.aptBathrooms;
      updates.apartmentDetails = {
        floorNumber: this.editForm.aptFloorNumber,
        totalFloors: this.editForm.aptTotalFloors,
        bhk: this.editForm.aptBhk,
        bathrooms: this.editForm.aptBathrooms,
        balconies: this.editForm.aptBalconies,
        monthlyMaintenance: this.editForm.aptMonthlyMaintenance,
        udsSqFt: this.editForm.aptUdsSqFt,
        facing: this.editForm.aptFacing
      };
    }

    updates.vicinity = {
      metroDistance: this.editForm.vicinityMetro.trim() || undefined,
      highwayDistance: this.editForm.vicinityHighway.trim() || undefined,
      schoolDistance: this.editForm.vicinitySchool.trim() || undefined,
      hospitalDistance: this.editForm.vicinityHospital.trim() || undefined,
      airportDistance: this.editForm.vicinityAirport.trim() || undefined
    };

    this.propertyService.updateProperty(cur.id, updates);
    this.editingProperty.set(null);
  }

  deleteProperty(prop: Property) {
    if (confirm(`Are you sure you want to delete "${prop.title}"?`)) {
      this.propertyService.deleteProperty(prop.id);
    }
  }

  // --- Sharing Operations ---
  openShareModal(prop: Property) {
    this.shareModalProperty.set(prop);
  }

  closeShareModal() {
    this.shareModalProperty.set(null);
  }

  async downloadBrochure(prop: Property) {
    this.isGeneratingBrochure.set(true);
    try {
      await this.brochureService.generateAndShareBrochure(prop);
    } catch (err) {
      console.error('Error generating brochure:', err);
    } finally {
      this.isGeneratingBrochure.set(false);
    }
  }

  shareViaWhatsApp(prop: Property) {
    this.brochureService.shareToWhatsApp(prop);
  }

  async copyPitch(prop: Property) {
    const success = await this.brochureService.copyPitch(prop);
    if (success) {
      this.copiedNotice.set(true);
      setTimeout(() => this.copiedNotice.set(false), 2500);
    }
  }

  async shareDeviceNative(prop: Property) {
    await this.brochureService.shareNative(prop);
  }

  // Stats & Deal Triggers
  openStatsDrawer(prop: Property) {
    this.selectedPropertyForStats.set(prop);
  }

  handleCloseDeal(prop: Property) {
    this.selectedPropertyForStats.set(null);
    this.detailedProperty.set(null);
    this.dealModalProp = prop;
    this.dealModalOpen.set(true);
  }

  openDetails(prop: Property) {
    this.detailedProperty.set(prop);
  }

  getIntel(prop: Property) {
    return this.analyticsService.getPropertyIntelligence(prop);
  }
}
