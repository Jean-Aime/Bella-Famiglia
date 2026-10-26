import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { BrandConfig } from '@/types';
import { fetchBrandConfig } from '@/services/dataService';

const defaultBrand: BrandConfig = {
  name: 'Bella Famiglia',
  tagline: 'Guest House · Musanze, Rwanda',
  description: 'A private guest house at the edge of Musanze town, with volcano views and two independent entrances.',
  whatsappNumber: '',
  whatsappEnabled: false,
  contactEmail: '',
  contactPhone: '',
  hostName: 'Niyomizero',
  airbnbProfileUrl: '',
  instagramUrl: '',
  facebookUrl: '',
  checkInTime: '15:00',
  checkOutTime: '08:00',
  cancellationPolicy: '',
  houseRules: '',
  locationNeighborhood: '',
  locationAirportDistance: '',
  locationCityCenterDistance: '',
  publicAddress: 'Musanze (Ruhengeri), Rwanda',
  addressDisclosure: 'The exact address and telephone number are provided after your booking is confirmed.',
  locationMapUrl: 'https://www.openstreetmap.org/?mlat=-1.4998&mlon=29.6345#map=14/-1.4998/29.6345',
  showPublicPrice: false,
  sizeLabel: '12 m²',
  bedDescription: 'Bed',
  checkInWindow: 'From 3:00 PM to 6:00 PM',
  checkOutWindow: 'From 8:00 AM to 11:00 AM',
  childrenPolicy: 'Children of all ages are welcome. Guests aged 18 and above are charged as adults.',
  extraBedsPolicy: 'Cribs and extra beds are not available.',
  paymentPolicy: 'Cash only.',
  smokingPolicy: 'Smoking is not allowed.',
  petsPolicy: 'Pets are not allowed.',
  ageRestriction: 'There is no age requirement for check-in.',
  spokenLanguages: 'English and French',
  breakfastInfo: 'Breakfast service is not listed. Please contact the host to confirm arrangements.',
  airportShuttleInfo: 'An airport shuttle is not listed. Please contact the host to ask about transport.',
  restaurantInfo: 'There is no on-site restaurant listed. Nearby cafes and restaurants are in Musanze town.',
  poolSpaInfo: 'A swimming pool and spa are not listed among the property facilities.',
  bathroomInfo: 'The apartment has two bathrooms. The listing does not specify whether they are private en-suite bathrooms.',
  nearbyAttractions: 'Volcanoes National Park — 3.7 km\nBar Sharama — 2.5 km\nAuberge Ikaze Bar — 2.5 km\nIbisumizi Resto-Bar — 2.6 km\nMusanze town centre — 2.5 km\nKisoro Airport — 37 km\nGoma International Airport — 65 km',
  announcement: '',
};

interface BrandContextValue {
  brand: BrandConfig;
  loading: boolean;
}

const BrandContext = createContext<BrandContextValue | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<BrandConfig>(defaultBrand);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrandConfig()
      .then((config) => setBrand(config))
      .catch(() => setBrand(defaultBrand))
      .finally(() => setLoading(false));
  }, []);

  return (
    <BrandContext.Provider value={{ brand, loading }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error('useBrand must be used within BrandProvider');
  return ctx;
}
