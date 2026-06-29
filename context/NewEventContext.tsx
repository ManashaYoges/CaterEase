import React, { createContext, useContext, useState } from 'react';
import { MenuItem } from '@/types';

export interface EventDate {
  id: string;
  date: string;
  mealTypes: string[];
}

export interface SelectedMenuItem extends MenuItem {
  mealCategory: string;
}

export interface DateMenu {
  dateId: string;
  selectedItems: SelectedMenuItem[];
  guestCount: number;   // ← per-date guest count
}

export interface NewEventData {
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
  menuType: string;
  selectedItems: SelectedMenuItem[];
  dateMenus: DateMenu[];
  currentDateIndex: number;
  advanceAmount: string;
  paymentStatus: string;
}

const defaultData: NewEventData = {
  customerId: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerAddress: '',
  eventName: '',
  eventType: 'wedding',
  eventDates: [],
  venue: '',
  guestCount: 100,
  menuType: 'veg',
  selectedItems: [],
  dateMenus: [],
  currentDateIndex: 0,
  advanceAmount: '',
  paymentStatus: 'not_received',
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