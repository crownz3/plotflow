import { Property, Lead, SiteVisit, Deal, Tenant, UserProfile } from '../models/models';

  export const DEMO_PROPERTIES: Property[] = [
    {
      id: 'prop_01',
      tenantId: 'tenant_prime_properties',
      title: 'Luxury 3BHK Sea-View Penthouse at ECR',
      description: 'Exclusive beachfront residence with panoramic Bay of Bengal views, Italian marble flooring, and private plunge pool.',
      propertyType: 'apartment',
      listingType: 'sale',
      status: 'available',
      price: 24500000, // 2.45 Cr
      negotiable: true,
      area: 2850,
      areaUnit: 'sqft',
      bhk: '3BHK',
      bathrooms: 4,
      facing: 'East',
      location: {
        address: 'Olive Beach Road, ECR',
        city: 'Chennai',
        locality: 'Injambakkam',
        pincode: '600115'
      },
      amenities: ['Private Pool', 'Sea View', 'Covered Parking', 'Clubhouse', 'Power Backup', '24/7 Security'],
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'
      ],
      ownerDetails: {
        name: 'Dr. Subramanian Ramanathan',
        phone: '+91 98401 23456',
        expectedPrice: 24000000,
        privateNotes: 'NRI Owner in Singapore. Wants quick registration before December.'
      },
      assignedAgentId: 'user_agent_01',
      assignedAgentName: 'Arun Kumar',
      featured: true,
      createdBy: 'user_admin_01',
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now()
    },
    {
      id: 'prop_02',
      tenantId: 'tenant_prime_properties',
      title: 'Modern Gated Community Villa in Sholinganallur',
      description: '4BHK Triplex independent villa with private garden, smart home automation, and 2-car covered garage.',
      propertyType: 'villa',
      listingType: 'sale',
      status: 'under_offer',
      price: 18500000, // 1.85 Cr
      negotiable: false,
      area: 3200,
      areaUnit: 'sqft',
      bhk: '4BHK',
      bathrooms: 4,
      facing: 'North',
      location: {
        address: 'OMR IT Corridor, Near ELCOT SEZ',
        city: 'Chennai',
        locality: 'Sholinganallur',
        pincode: '600119'
      },
      amenities: ['Gated Community', 'Gym', 'Children Play Area', 'Solar Water Heater', 'Landscaped Garden'],
      images: [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80'
      ],
      ownerDetails: {
        name: 'Mrs. Jayashree Venkat',
        phone: '+91 94440 98765',
        expectedPrice: 18000000,
        privateNotes: 'Buyer token of 5 Lakhs received. Agreement in progress.'
      },
      assignedAgentId: 'user_agent_01',
      assignedAgentName: 'Arun Kumar',
      featured: false,
      createdBy: 'user_admin_01',
      createdAt: Date.now() - 86400000 * 12,
      updatedAt: Date.now()
    },
    {
      id: 'prop_03',
      tenantId: 'tenant_prime_properties',
      title: 'CMDA Approved Residential Plot in Velachery',
      description: 'South-facing rectangular residential plot ready for immediate construction. High-appreciation locality.',
      propertyType: 'plot',
      listingType: 'sale',
      status: 'available',
      price: 9500000, // 95 L
      negotiable: true,
      area: 2400, // 1 Ground
      areaUnit: 'sqft',
      facing: 'South',
      location: {
        address: 'Vijaya Nagar 3rd Main Road',
        city: 'Chennai',
        locality: 'Velachery',
        pincode: '600042'
      },
      amenities: ['CMDA Approved', 'Clear Title', 'Tar Road Access', 'Metro Water Supply'],
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'
      ],
      ownerDetails: {
        name: 'Mr. K. Narayanan',
        phone: '+91 97900 11223',
        expectedPrice: 9000000,
        privateNotes: 'Ancestral property, all legal documents vetted by agency advocate.'
      },
      assignedAgentId: 'user_admin_01',
      assignedAgentName: 'Rajesh Sharma',
      featured: true,
      createdBy: 'user_admin_01',
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now()
    },
    {
      id: 'prop_04',
      tenantId: 'tenant_prime_properties',
      title: 'Grade-A Plug & Play Commercial Office Space',
      description: 'Fully furnished corporate office with 60 workstations, 2 conference rooms, server room, and cafeteria.',
      propertyType: 'commercial',
      listingType: 'rent',
      status: 'available',
      price: 275000, // 2.75 L / month
      negotiable: true,
      area: 4500,
      areaUnit: 'sqft',
      location: {
        address: 'Mount Road Commercial Spine',
        city: 'Chennai',
        locality: 'Guindy',
        pincode: '600032'
      },
      amenities: ['Central Air-Conditioning', '100% DG Backup', 'High-Speed Elevators', 'Basement Parking', 'Fire Safety NOC'],
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
      ],
      ownerDetails: {
        name: 'Empire Estates Pvt Ltd',
        phone: '+91 99620 44556',
        expectedPrice: 250000,
        privateNotes: 'Prefers MNC or funded tech startup. 6 months security deposit.'
      },
      assignedAgentId: 'user_agent_01',
      assignedAgentName: 'Arun Kumar',
      featured: false,
      createdBy: 'user_admin_01',
      createdAt: Date.now() - 86400000 * 8,
      updatedAt: Date.now()
    }
  ];


  export const DEMO_LEADS: Lead[] = [
    {
      id: 'lead_01',
      tenantId: 'tenant_prime_properties',
      name: 'Anand Sundaresan',
      phone: '+91 98410 77889',
      email: 'anand.s.techcorp@gmail.com',
      source: 'portal_99acres',
      stage: 'negotiation',
      priority: 'hot',
      requirement: {
        propertyTypes: ['apartment', 'penthouse'],
        listingType: 'sale',
        budgetMin: 20000000, // 2 Cr
        budgetMax: 26000000, // 2.6 Cr
        preferredLocations: ['ECR', 'Injambakkam', 'Thiruvanmiyur'],
        minArea: 2500
      },
      assignedAgentId: 'user_agent_01',
      assignedAgentName: 'Arun Kumar',
      lastContactedAt: Date.now() - 3600000 * 4,
      nextFollowUpAt: Date.now() + 3600000 * 2,
      notes: [
        {
          id: 'note_1',
          text: 'Client loves the ECR 3BHK Penthouse. Offered 2.35 Cr against asking 2.45 Cr. Negotiating with owner.',
          createdAt: Date.now() - 86400000,
          authorName: 'Arun Kumar'
        }
      ],
      createdAt: Date.now() - 86400000 * 8,
      updatedAt: Date.now()
    },
    {
      id: 'lead_02',
      tenantId: 'tenant_prime_properties',
      name: 'Karthik & Priya Narayanan',
      phone: '+91 97911 33445',
      email: 'karthik.n@gmail.com',
      source: 'referral',
      stage: 'visit_scheduled',
      priority: 'hot',
      requirement: {
        propertyTypes: ['villa'],
        listingType: 'sale',
        budgetMin: 16000000, // 1.6 Cr
        budgetMax: 20000000, // 2.0 Cr
        preferredLocations: ['Sholinganallur', 'Perungudi', 'OMR'],
        minArea: 2800
      },
      assignedAgentId: 'user_agent_01',
      assignedAgentName: 'Arun Kumar',
      lastContactedAt: Date.now() - 86400000 * 2,
      nextFollowUpAt: Date.now() + 3600000 * 6,
      notes: [
        {
          id: 'note_2',
          text: 'Site visit scheduled for Sholinganallur Villa this evening at 5:00 PM.',
          createdAt: Date.now() - 86400000 * 2,
          authorName: 'Arun Kumar'
        }
      ],
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now()
    },
    {
      id: 'lead_03',
      tenantId: 'tenant_prime_properties',
      name: 'Vikram Mehta (VP Logistics)',
      phone: '+91 98840 55667',
      email: 'vmehta@logistics.in',
      source: 'walk_in',
      stage: 'contacted',
      priority: 'warm',
      requirement: {
        propertyTypes: ['plot'],
        listingType: 'sale',
        budgetMin: 8000000, // 80 L
        budgetMax: 11000000, // 1.1 Cr
        preferredLocations: ['Velachery', 'Madipakkam', 'Adambakkam'],
        minArea: 2000
      },
      assignedAgentId: 'user_admin_01',
      assignedAgentName: 'Rajesh Sharma',
      lastContactedAt: Date.now() - 86400000 * 3,
      nextFollowUpAt: Date.now() + 86400000,
      notes: [
        {
          id: 'note_3',
          text: 'Looking for 1 Ground plot for self-construction. Shared Velachery plot brochure via WhatsApp.',
          createdAt: Date.now() - 86400000 * 3,
          authorName: 'Rajesh Sharma'
        }
      ],
      createdAt: Date.now() - 86400000 * 4,
      updatedAt: Date.now()
    },
    {
      id: 'lead_04',
      tenantId: 'tenant_prime_properties',
      name: 'Cognizant Team Lead - Harish',
      phone: '+91 99400 88990',
      email: 'harish.r@outlook.com',
      source: 'social_media',
      stage: 'new',
      priority: 'warm',
      requirement: {
        propertyTypes: ['apartment', 'villa'],
        listingType: 'sale',
        budgetMin: 12000000,
        budgetMax: 17000000,
        preferredLocations: ['OMR', 'Perungudi', 'Thoraipakkam']
      },
      assignedAgentId: 'user_agent_01',
      assignedAgentName: 'Arun Kumar',
      notes: [],
      createdAt: Date.now() - 3600000 * 12,
      updatedAt: Date.now()
    }
  ];


  export const DEMO_VISITS: SiteVisit[] = [
    {
      id: 'visit_01',
      tenantId: 'tenant_prime_properties',
      leadId: 'lead_02',
      leadName: 'Karthik Narayanan',
      leadPhone: '+91 97911 33445',
      propertyId: 'prop_02',
      propertyTitle: 'Modern Gated Community Villa in Sholinganallur',
      propertyLocation: 'Sholinganallur, OMR',
      agentId: 'user_agent_01',
      agentName: 'Arun Kumar',
      scheduledTime: Date.now() + 3600000 * 3, // 3 hours from now
      status: 'scheduled',
      createdAt: Date.now() - 86400000
    },
    {
      id: 'visit_02',
      tenantId: 'tenant_prime_properties',
      leadId: 'lead_03',
      leadName: 'Vikram Mehta',
      leadPhone: '+91 98840 55667',
      propertyId: 'prop_03',
      propertyTitle: 'CMDA Approved Residential Plot in Velachery',
      propertyLocation: 'Vijaya Nagar, Velachery',
      agentId: 'user_admin_01',
      agentName: 'Rajesh Sharma',
      scheduledTime: Date.now() + 86400000 * 1.5,
      status: 'scheduled',
      createdAt: Date.now() - 86400000 * 2
    }
  ];


  export const DEMO_DEALS: Deal[] = [
    {
      id: 'deal_01',
      tenantId: 'tenant_prime_properties',
      dealTitle: 'Alwarpet 3BHK Luxury Resale',
      propertyId: 'prop_archived_01',
      propertyTitle: 'Alwarpet Heritage Apartments',
      leadId: 'lead_archived_01',
      clientName: 'Sanjay Kumar (Industrialist)',
      agentId: 'user_agent_01',
      agentName: 'Arun Kumar',
      dealValue: 32000000, // 3.20 Cr
      buyerBrokeragePercent: 1.0,
      sellerBrokeragePercent: 1.0,
      grossBrokerage: 640000, // 6.4 L
      gstPercent: 18,
      gstAmount: 115200,
      agentCommissionPercent: 25,
      agentCommissionAmount: 131200,
      netAgencyBrokerage: 393600,
      totalReceived: 640000,
      balanceReceivable: 0,
      closingDate: Date.now() - 86400000 * 10,
      status: 'closed_won',
      createdAt: Date.now() - 86400000 * 15
    },
    {
      id: 'deal_02',
      tenantId: 'tenant_prime_properties',
      dealTitle: 'Injambakkam Beach House Rental',
      propertyId: 'prop_archived_02',
      propertyTitle: 'Injambakkam Beach Villa',
      leadId: 'lead_archived_02',
      clientName: 'Hyundai Motors Expat Executive',
      agentId: 'user_agent_01',
      agentName: 'Arun Kumar',
      dealValue: 1800000, // Annual Rent 18 L
      buyerBrokeragePercent: 8.33, // 1 month rent
      sellerBrokeragePercent: 8.33, // 1 month rent
      grossBrokerage: 300000, // 3 L
      gstPercent: 18,
      gstAmount: 54000,
      agentCommissionPercent: 30,
      agentCommissionAmount: 73800,
      netAgencyBrokerage: 172200,
      totalReceived: 200000,
      balanceReceivable: 100000,
      closingDate: Date.now() - 86400000 * 3,
      status: 'closed_won',
      createdAt: Date.now() - 86400000 * 5
    }
  ];


  export const DEMO_TENANTS: Tenant[] = [
    {
      id: 'tenant_prime_properties',
      agencyName: 'Prime Properties & Realty',
      ownerUid: 'user_admin_01',
      reraNumber: 'TN/01/RealEstate/2024/7890',
      phone: '+91 98765 43210',
      email: 'contact.primeproperties@gmail.com',
      address: 'Suite 402, Anna Salai, Chennai, Tamil Nadu - 600002',
      currency: 'INR',
      defaultAreaUnit: 'sqft',
      subscriptionPlan: 'pro',
      trialExpiresAt: Date.now() + 86400000 * 14,
      totalAgentsCount: 6,
      totalListingsCount: 18,
      createdAt: Date.now() - 86400000 * 15,
      updatedAt: Date.now()
    },
    {
      id: 'tenant_apex_realtors',
      agencyName: 'Apex Metro Realtors',
      ownerUid: 'user_admin_02',
      reraNumber: 'KA/02/RealEstate/2023/1234',
      phone: '+91 98450 11223',
      email: 'info.apexrealtors@gmail.com',
      address: '100 Feet Road, Indiranagar, Bengaluru, Karnataka - 560038',
      currency: 'INR',
      defaultAreaUnit: 'sqft',
      subscriptionPlan: 'trial',
      trialExpiresAt: Date.now() + 86400000 * 10,
      totalAgentsCount: 4,
      totalListingsCount: 12,
      createdAt: Date.now() - 86400000 * 4,
      updatedAt: Date.now()
    }
  ];

  export const DEMO_TEAM_MEMBERS: UserProfile[] = [
    {
      uid: 'user_admin_01',
      email: 'primeproperties.broker@gmail.com',
      displayName: 'Rajesh Sharma (Principal Broker)',
      phoneNumber: '+91 98765 43210',
      role: 'agency_admin',
      tenantId: 'tenant_prime_properties',
      agencyName: 'Prime Properties & Realty',
      isActive: true,
      createdAt: Date.now() - 86400000 * 15
    },
    {
      uid: 'user_agent_01',
      email: 'primeproperties.agent@gmail.com',
      displayName: 'Arun Kumar (Associate Broker)',
      phoneNumber: '+91 91234 56789',
      role: 'agent',
      tenantId: 'tenant_prime_properties',
      agencyName: 'Prime Properties & Realty',
      isActive: true,
      createdAt: Date.now() - 86400000 * 7
    }
  ];