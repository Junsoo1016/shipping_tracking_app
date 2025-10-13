export type ShipmentStatus =
  | 'created'
  | 'in_transit'
  | 'arrived_port'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception';

export type CarrierCode = 'maersk' | 'hmm' | 'other';

export type Shipment = {
  id: string;
  ownerUid: string;
  carrier: CarrierCode;
  trackingNumber: string;
  status: ShipmentStatus;
  vesselName?: string;
  eta?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  archived: boolean;
  lastUpdatedAt: string;
};
