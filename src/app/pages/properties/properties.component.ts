import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../core/services/property.service';
import { PropertyCardComponent } from '../../shared/components/property-card/property-card.component';
import { Property } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, FormsModule, PropertyCardComponent],
  templateUrl: './properties.component.html',
  styleUrl: './properties.component.scss'
})
export class PropertiesComponent {
  propertyService = inject(PropertyService);
  auth = inject(AuthService);

  searchQuery = '';
  selectedType = signal<string>('all');
  selectedProperty = signal<Property | null>(null);
  openAddModal = signal(false);
  editingProperty = signal<Property | null>(null);

  editForm = {
    title: '',
    status: 'available' as any,
    price: 0,
    area: 0
  };

  newProp = {
    title: '',
    propertyType: 'apartment' as any,
    listingType: 'sale' as any,
    price: 15000000,
    area: 1850,
    locality: '',
    city: 'Chennai',
    ownerName: '',
    ownerPhone: ''
  };

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
        (p.bhk && p.bhk.toLowerCase().includes(q))
      );
    }
    return list;
  });

  saveProperty() {
    if (!this.newProp.title) return;
    this.propertyService.addProperty({
      tenantId: this.auth.activeTenantId(),
      title: this.newProp.title,
      description: 'Newly ingested verified real estate property listing with direct road connectivity.',
      propertyType: this.newProp.propertyType,
      listingType: this.newProp.listingType,
      status: 'available',
      price: this.newProp.price,
      negotiable: true,
      area: this.newProp.area,
      areaUnit: 'sqft',
      bhk: '3BHK',
      location: {
        address: this.newProp.locality,
        city: this.newProp.city,
        locality: this.newProp.locality
      },
      amenities: ['Covered Parking', '24/7 Security', 'Elevator', 'Power Backup'],
      images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'],
      ownerDetails: {
        name: this.newProp.ownerName || 'Verified Owner',
        phone: this.newProp.ownerPhone || '+91 98888 77777'
      },
      assignedAgentId: this.auth.currentUser()?.uid || 'user_agent_01',
      assignedAgentName: this.auth.currentUser()?.displayName || 'Arun Kumar',
      createdBy: this.auth.currentUser()?.uid || 'user_admin_01'
    });

    this.openAddModal.set(false);
  }

  startEditProperty(prop: Property) {
    this.editingProperty.set(prop);
    this.editForm = {
      title: prop.title,
      status: prop.status,
      price: prop.price,
      area: prop.area
    };
  }

  saveEditProperty() {
    const cur = this.editingProperty();
    if (!cur) return;
    this.propertyService.updateProperty(cur.id, {
      title: this.editForm.title,
      status: this.editForm.status,
      price: this.editForm.price,
      area: this.editForm.area
    });
    this.editingProperty.set(null);
  }

  deleteProperty(prop: Property) {
    if (confirm(`Are you sure you want to delete "${prop.title}"?`)) {
      this.propertyService.deleteProperty(prop.id);
    }
  }
}
