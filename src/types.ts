export type PackageType = 'General';

export interface SelectedSeat {
  id: string; // ej. "B-7"
  fila: string;
  num: number;
  pkg: PackageType;
}

export interface BuyerInfo {
  fullName: string;
  phone: string;
}

export interface PaymentReportData {
  method?: string; // id del método en METODOS_PAGO (las compras antiguas no lo tienen: Pago Móvil)
  referenceNumber: string;
  bank: string;
  payerPhone: string;
  reportedAt: number;
}

export type ReservationStatus = 'pending_approval' | 'approved' | 'rejected';

export interface ReservationData {
  locatorCode: string;
  createdAt: number;
  seats: SelectedSeat[];
  buyer: BuyerInfo;
  paymentReport: PaymentReportData;
  approvalStatus: ReservationStatus;
  approvedAt?: number;
  rejectionReason?: string;
  // bcvRate = bolívares por € usados para cobrar; usdRate = bolívares por $ (referencia)
  bcvRate: number;
  // QR único de la compra (solo cuando está aprobada)
  qrGrupo?: string;
  usdRate?: number;
  totalEur?: number; // compras nuevas; las anteriores solo tienen totalUsd
  totalUsd: number;
  totalBs: number;
  termsAcceptedAt?: number;
  termsVersion?: string;
  // Firma de cada asiento para el QR (la entrega el servidor solo cuando la compra está aprobada)
  qr?: Record<string, string>;
}

export type CheckInMap = Record<string, { at: number; seatId: string; locator: string; name?: string }>;
