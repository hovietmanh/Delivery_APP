import { create } from 'zustand';
import { api } from '../services/api';

export type ServiceType = 'STATION_TO_STATION' | 'DOOR_TO_STATION' | 'STATION_TO_DOOR' | 'DOOR_TO_DOOR';
export type GoodsType = 'FASHION' | 'BULKY' | 'FOOD' | 'FRAGILE' | 'FROZEN' | 'ELECTRONICS' | 'OTHER';
export type WeightRange = 'UNDER_5KG' | 'FROM_5_TO_20KG' | 'FROM_20_TO_50KG' | 'OVER_50KG';
export type PaymentMethod = 'BANK_TRANSFER' | 'MOMO' | 'VIET_QR' | 'CASH_AT_STATION';

export interface OrderDraft {
  // Step 1 - Route & package
  fromCity: string;
  fromStation: string;
  toCity: string;
  toStation: string;
  serviceType: ServiceType;
  goodsType: GoodsType;
  weightRange: WeightRange;
  weightKg: number;

  // Step 2 - Trip selection
  tripId: string;
  tripCompany: string;
  tripPrice: number;
  departureTime: string;
  hasInsurance: boolean;
  tripData: any; // raw trip object from API

  // Step 3 - Parties
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  goodsDescription: string;
  goodsValue: number;

  // Step 4 - Payment
  discountCode: string;
  paymentMethod: PaymentMethod;
}

interface OrderStore {
  draft: Partial<OrderDraft>;
  isSubmitting: boolean;
  updateDraft: (updates: Partial<OrderDraft>) => void;
  resetDraft: () => void;
  submitOrder: () => Promise<{ id: string; trackingCode: string }>;
}

const WEIGHT_KG: Record<string, number> = {
  UNDER_5KG: 5,
  FROM_5_TO_20KG: 12,
  FROM_20_TO_50KG: 35,
  OVER_50KG: 60,
};

const DOOR_FEE: Record<string, number> = {
  STATION_TO_STATION: 0,
  DOOR_TO_STATION: 30000,
  STATION_TO_DOOR: 30000,
  DOOR_TO_DOOR: 60000,
};

export const useOrderStore = create<OrderStore>((set, get) => ({
  draft: {},
  isSubmitting: false,

  updateDraft: (updates) => set((s) => ({ draft: { ...s.draft, ...updates } })),

  resetDraft: () => set({ draft: {} }),

  submitOrder: async () => {
    const { draft } = get();
    set({ isSubmitting: true });
    try {
      const d = draft as any;
      const pricePerKg = draft.tripData?.pricePerKg ?? 45000;
      const weightKg = draft.weightKg ?? WEIGHT_KG[draft.weightRange ?? 'UNDER_5KG'];
      // Use pre-calculated values from review screen if available; recalculate otherwise
      const shippingFee = d.shippingFee ?? pricePerKg * weightKg;
      const doorFee = d.doorFee ?? DOOR_FEE[draft.serviceType ?? 'STATION_TO_STATION'];
      const insuranceFee = d.insuranceFee ?? (draft.hasInsurance ? 5000 : 0);
      const discount = d.discount ?? 0;
      const total = d.total ?? (shippingFee + doorFee + insuranceFee - discount);

      const { data } = await api.post('/orders', {
        fromCity: draft.fromCity,
        fromStation: draft.fromStation ?? draft.tripData?.fromStation ?? `Bến xe ${draft.fromCity}`,
        toCity: draft.toCity,
        toStation: draft.toStation ?? draft.tripData?.toStation ?? `Bến xe ${draft.toCity}`,
        // tripId assigned later when driver accepts the order
        serviceType: draft.serviceType,
        goodsType: draft.goodsType,
        weightRange: draft.weightRange,
        actualWeightKg: draft.weightKg ?? undefined,
        goodsDescription: draft.goodsDescription,
        goodsValue: draft.goodsValue ? Number(draft.goodsValue) : undefined,
        senderName: draft.senderName,
        senderPhone: draft.senderPhone,
        senderAddress: draft.senderAddress,
        receiverName: draft.receiverName,
        receiverPhone: draft.receiverPhone,
        receiverAddress: draft.receiverAddress,
        assignedCompanyName: draft.tripData?.companyName ?? undefined,
        assignedDriverId: draft.tripId ?? undefined,
        voucherId: d.voucherId ?? undefined,
        shippingFee,
        doorPickupFee: ['DOOR_TO_STATION', 'DOOR_TO_DOOR'].includes(draft.serviceType ?? '') ? 30000 : 0,
        doorDeliveryFee: ['STATION_TO_DOOR', 'DOOR_TO_DOOR'].includes(draft.serviceType ?? '') ? 30000 : 0,
        insuranceFee,
        discount,
        total,
        paymentMethod: draft.paymentMethod ?? 'CASH_AT_STATION',
        note: draft.goodsDescription,
      });

      return { id: data.id, trackingCode: data.trackingCode };
    } finally {
      set({ isSubmitting: false });
    }
  },
}));
