import React, { createContext, useContext, useState } from 'react';
import { MenuItem } from '@/types';

export interface EventDate {
  id: string;
  date: string;
  mealTypes: string[];
  mealTimings?: Record<string, MealTiming>;
}

export interface MealTiming {
  from: string;
  to: string;
}

export interface SelectedMenuItem extends MenuItem {
  mealCategory: string;
  isPriceEdited?: boolean;
  originalPrice?: number;
}

export interface DateMenu {
  dateId: string;
  selectedItems: SelectedMenuItem[];
  guestCount: number;   // ← per-date guest count
  mealTimings?: Record<string, MealTiming>;
}

export interface NewEventData {
  eventId?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  eventName: string;
  eventType: string;
  eventDates: EventDate[];
  venue: string;
  guestCount: number;       // default/fallback
  notes?: string;
  menuType: string;
  selectedItems: SelectedMenuItem[];
  dateMenus: DateMenu[];
  currentDateIndex: number;
  advanceAmount: string;
  paymentStatus: string;
  attachmentPhotos: string[];   // local URIs before save, download URLs after
attachmentDocs: { name: string; uri: string }[];
}

const defaultData: NewEventData = {
  eventId: undefined,
  customerId: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerAddress: '',
  eventName: '',
  eventType: '',
  eventDates: [],
  venue: '',
  guestCount: 0,
  notes: '',
  menuType: '',
  selectedItems: [],
  dateMenus: [],
  currentDateIndex: 0,
  advanceAmount: '',
  paymentStatus: 'not_received',
  attachmentPhotos: [],
attachmentDocs: [],
};

interface NewEventContextType {
  data: NewEventData;
  update: (partial: Partial<NewEventData>) => void;
  reset: () => void;
}

const NewEventContext = createContext<NewEventContextType>({
  data: defaultData,
  update: () => {},
  reset: () => {},
});

export function NewEventProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<NewEventData>(defaultData);
  const update = (partial: Partial<NewEventData>) =>
    setData(prev => ({ ...prev, ...partial }));
  const reset = () => setData(defaultData);
  return (
    <NewEventContext.Provider value={{ data, update, reset }}>
      {children}
    </NewEventContext.Provider>
  );
}

export const useNewEvent = () => useContext(NewEventContext);
