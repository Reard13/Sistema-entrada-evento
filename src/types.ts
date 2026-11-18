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
  bcvRate: number;
  totalUsd: number;
  totalBs: number;
  termsAcceptedAt?: number;
  termsVersion?: string;
  // Firma de cada asiento para el QR (la entrega el servidor solo cuando la compra está aprobada)
  qr?: Record<string, string>;
}

export type CheckInMap = Record<string, { at: number; seatId: string; locator: string; name?: string }>;
