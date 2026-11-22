import { Injectable, signal, computed, inject } from '@angular/core';
import { Property } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private auth = inject(AuthService);
  private storageKey = 'pf_properties';

  private readonly seedProperties: Property[] = [
    {
      id: 'prop_seed_plot_01',
      tenantId: 'tenant_prime_properties',
      title: 'ECR Beachside Residential Villa Plot (DTCP & RERA Approved)',
      description: 'Exclusive 2400 sq.ft residential villa plot inside a high-end gated community along the East Coast Road (ECR). Ideal for immediate luxury villa construction with 40ft blacktop road frontage, copious sweet water table at 25ft depth, underground cabling, and round-the-clock CCTV security.',
      propertyType: 'plot',
      listingType: 'sale',
      status: 'available',
      price: 18000000,
      negotiable: true,
      area: 2400,
      areaUnit: 'sqft',
      facing: 'East',
      location: {
        address: 'Plot #42, Ocean Breeze Avenue, ECR Panaiyur',
        city: 'Chennai',
        locality: 'Panaiyur, ECR',
        pincode: '600119'
      },
      mapsUrl: 'https://maps.google.com/?q=Panaiyur,Chennai',
      plotDetails: {
        dimensions: '40 x 60',
        roadWidthFt: 40,
        approvalStatus: 'DTCP',
        isCornerPlot: true,
        hasBoundaryWall: true,
        isGatedLayout: true,
        soilType: 'Red Sand / Loamy'
      },
      infrastructure: [
        '24/7 Gated Security & CCTV',
        'Copious Sweet Water (Borewell)',
        '40ft Wide Blacktop Road',
        'Underground Electricity & EB Meter',
        'Covered Stormwater Drainage',
        'Street Lighting & Avenue Trees'
      ],
      vicinity: {
        metroDistance: '12 mins to Sholinganallur Metro',
        highwayDistance: 'Direct access to ECR Coastal Expressway',
        schoolDistance: '5 mins to Gateway International School',
        hospitalDistance: '10 mins to Gleneagles Global Health City',
        airportDistance: '35 mins to Chennai International Airport'
      },
      amenities: ['Gated Community', '24/7 Security', 'Blacktop Roads', 'Water Supply'],
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1524813686514-a57563d77d61?w=800&auto=format&fit=crop&q=80'
      ],
      media: {
        videoTourUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      },
      ownerDetails: {
        name: 'K. Balasubramanian',
        phone: '+91 94440 12345',
        expectedPrice: 17500000,
        privateNotes: 'Clear parent title documents verified. Ready for immediate registration.'
      },
      assignedAgentId: 'user_agent_01',
      assignedAgentName: 'Karthik Raja',
      featured: true,
      createdBy: 'user_admin_01',
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now() - 86400000 * 1
    },
    {
      id: 'prop_seed_villa_02',
      tenantId: 'tenant_prime_properties',
      title: '4BHK G+2 Ultra-Luxury Independent Duplex Villa in OMR Tech Corridor',
      description: 'Brand new 3600 sq.ft built-up triplex villa on 2100 sq.ft plot. Features Italian marble flooring, imported modular kitchen, private landscaped terrace garden, Home Automation, and 2 covered car parking slots. 100% Vastu compliant.',
      propertyType: 'villa',
      listingType: 'sale',
      status: 'available',
      price: 32500000,
      negotiable: false,
      area: 3600,
      areaUnit: 'sqft',
      bhk: '4BHK',
      bathrooms: 4,
      facing: 'North-East',
      location: {
        address: 'Villa 18, Palm Meadows, Navalur OMR',
        city: 'Chennai',
        locality: 'Navalur, OMR',
        pincode: '600130'
      },
      mapsUrl: 'https://maps.google.com/?q=Navalur,Chennai',
      villaDetails: {
        plotArea: 2100,
        builtUpArea: 3600,
        floors: 'G+2 Triplex',
        bedrooms: 4,
        bathrooms: 4,
        carParking: 2,
        hasGarden: true,
        facing: 'North-East',
        furnishing: 'semi-furnished'
      },
      infrastructure: [
        '100% DG Power Backup',
        'Metro & RO Water Supply',
        'Clubhouse with Swimming Pool & Gym',
        '24/7 Multi-Tier Security with Intercom',
        'Private Landscaped Lawn & Rooftop Deck',
        'Solar Water Heater & EV Charger Port'
      ],
      vicinity: {
        metroDistance: '5 mins to Navalur Metro Station (Phase 2)',
        highwayDistance: 'Adjacent to OMR IT Expressway',
        schoolDistance: '7 mins to Hiranandani Upscale School',
        hospitalDistance: '8 mins to Chettinad Health City'
      },
      amenities: ['Clubhouse', 'Swimming Pool', 'Gym', 'Private Garden', 'Power Backup'],
      images: [
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80'
      ],
      ownerDetails: {
        name: 'Suresh Narayanan',
        phone: '+91 98840 98765',
        expectedPrice: 32000000,
        privateNotes: 'Bank NOC obtained from HDFC. All municipal approvals in place.'
      },
      assignedAgentId: 'user_agent_01',
      assignedAgentName: 'Karthik Raja',
      featured: true,
      createdBy: 'user_admin_01',
      createdAt: Date.now() - 86400000 * 8,
      updatedAt: Date.now() - 86400000 * 2
    },
    {
      id: 'prop_seed_apt_03',
      tenantId: 'tenant_prime_properties',
      title: '3BHK Lake-Facing High-Rise Luxury Apartment in Adyar',
      description: 'Superb 1850 sq.ft 3-bedroom residence on the 8th floor overlooking Adyar estuary. High ceiling, French windows, imported fittings, 680 sq.ft Undivided Share of Land (UDS), and full five-star amenities.',
      propertyType: 'apartment',
      listingType: 'sale',
      status: 'under_offer',
      price: 26000000,
      negotiable: true,
      area: 1850,
      areaUnit: 'sqft',
      bhk: '3BHK',
      bathrooms: 3,
      facing: 'East',
      location: {
        address: 'Tower B, Floor 8, Adyar Grand Bay, Gandhi Nagar',
        city: 'Chennai',
        locality: 'Adyar',
        pincode: '600020'
      },
      mapsUrl: 'https://maps.google.com/?q=Adyar,Chennai',
      apartmentDetails: {
        floorNumber: 8,
        totalFloors: 14,
        bhk: '3BHK',
        bathrooms: 3,
        balconies: 2,
        monthlyMaintenance: 6500,
        udsSqFt: 680,
        facing: 'East'
      },
      infrastructure: [
        'Twin Passenger & Service Lifts',
        'Metro Water Connection',
        'Full Power Backup',
        'Underground Covered Car Parking',
        'Rooftop Infinity Swimming Pool',
        'Concierge Reception Desk'
      ],
      vicinity: {
        metroDistance: '8 mins to Adyar Metro Station',
        highwayDistance: 'Direct connectivity to Sardar Patel Road',
        hospitalDistance: '5 mins to Fortis Malar Hospital',
        schoolDistance: '4 mins to St. Michael’s Academy'
      },
      amenities: ['Swimming Pool', 'Gym', 'Lifts', 'Covered Parking', 'Sea Breeze View'],
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80'
      ],
      ownerDetails: {
        name: 'Dr. Radhakrishnan',
        phone: '+91 98401 55678',
        expectedPrice: 25500000,
        privateNotes: 'NRI client living in Singapore. Key available with building caretaker.'
      },
      assignedAgentId: 'user_agent_01',
      assignedAgentName: 'Karthik Raja',
      featured: false,
      createdBy: 'user_admin_01',
      createdAt: Date.now() - 86400000 * 14,
      updatedAt: Date.now() - 86400000 * 3
    }
  ];

  readonly allProperties = signal<Property[]>(this.loadInitial());

  // Scoped strictly by active tenant
  readonly tenantProperties = computed(() => {
    const tId = this.auth.activeTenantId();
    if (!tId) return [];
    if (this.auth.isSuperAdmin() && tId === 'platform_global') {
      return this.allProperties();
    }
    return this.allProperties().filter(p => p.tenantId === tId);
  });

  // Active listings count
  readonly activeCount = computed(() =>
    this.tenantProperties().filter(p => p.status === 'available').length
  );

  private loadInitial(): Property[] {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return this.seedProperties;
    } catch {
      return this.seedProperties;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.allProperties()));
    } catch (e) {
      console.warn('Failed to persist properties:', e);
    }
  }

  addProperty(data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Property {
    const newProp: Property = {
      ...data,
      id: `prop_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.allProperties.update(list => [newProp, ...list]);
    this.save();
    return newProp;
  }

  updateProperty(id: string, updates: Partial<Property>): void {
    this.allProperties.update(list =>
      list.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)
    );
    this.save();
  }

  deleteProperty(id: string): void {
    this.allProperties.update(list => list.filter(p => p.id !== id));
    this.save();
  }
}
