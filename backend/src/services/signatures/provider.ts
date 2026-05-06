import crypto from 'node:crypto';
import { env } from '../../config/env.js';

export type SignatureRecipient = {
  name: string;
  email: string;
  role: string;
  routing_order: number;
  status?: string;
  signed_at?: string | null;
  viewed_at?: string | null;
};

export type PlacementPreview = {
  success: boolean;
  placement_mode: 'pattern' | 'fallback';
  zones_detected: number;
  summary: string;
  signer_map: Record<string, string[]>;
};

type SignatureProviderRecord = {
  id: string;
  status: string;
  provider: string;
  data: Record<string, unknown>;
};

type SendSignatureRequestInput = {
  title: string;
  subject: string;
  message: string;
  recipients: SignatureRecipient[];
  documentName: string;
};

type ProviderResponse = {
  provider: string;
  providerRequestId: string;
  status: string;
  recipients: SignatureRecipient[];
  auditEvents: Array<Record<string, unknown>>;
};

function buildAuditEvent(eventType: string, notes: string) {
  return {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    notes,
    ip_address: 'system',
  };
}

function buildSignerMap(recipients: SignatureRecipient[]) {
  return recipients.reduce<Record<string, string[]>>((map, recipient, index) => {
    const slot = `signer${index + 1}`;
    if (!map[recipient.role]) {
      map[recipient.role] = [];
    }
    map[recipient.role].push(slot);
    return map;
  }, {});
}

function buildPlacementPreview(documentType: string, recipients: SignatureRecipient[]): PlacementPreview {
  const signerMap = buildSignerMap(recipients);
  const zonesByType: Record<string, string[]> = {
    purchase_and_sale: ['buyer', 'seller', 'agent'],
    listing_agreement: ['seller', 'agent'],
    buyer_agency_agreement: ['buyer', 'agent'],
    disclosure: ['buyer', 'seller'],
    addendum: ['buyer', 'seller'],
    closing: ['buyer', 'seller'],
    inspection: ['buyer'],
    other: ['buyer'],
  };

  const roles = zonesByType[documentType] ?? zonesByType.other;
  const detectedRoles = roles.filter((role) => signerMap[role]?.length);
  const summary = detectedRoles.length > 0 ? detectedRoles.map((role) => `${role}: signature, date`).join(' · ') : 'Fallback placement will append generic signature fields.';

  return {
    success: true,
    placement_mode: detectedRoles.length > 0 ? 'pattern' : 'fallback',
    zones_detected: detectedRoles.reduce((count, role) => count + (signerMap[role]?.length ?? 0) * 2, 0),
    summary,
    signer_map: signerMap,
  };
}

const internalProvider = {
  name: 'internal',
  previewPlacement: buildPlacementPreview,
  async sendRequest(input: SendSignatureRequestInput): Promise<ProviderResponse> {
    const providerRequestId = crypto.randomUUID();
    return {
      provider: 'internal',
      providerRequestId,
      status: 'sent',
      recipients: input.recipients.map((recipient) => ({
        ...recipient,
        status: 'pending',
        signed_at: null,
        viewed_at: null,
      })),
      auditEvents: [
        buildAuditEvent('created', `Signature request created for ${input.documentName}.`),
        buildAuditEvent('sent', `Signature request sent to ${input.recipients.length} recipient(s).`),
      ],
    };
  },
  async refreshRequest(record: SignatureProviderRecord): Promise<Partial<ProviderResponse>> {
    return {
      provider: record.provider,
      providerRequestId: String(record.data.provider_request_id ?? record.id),
      status: record.status,
      recipients: Array.isArray(record.data.recipients) ? (record.data.recipients as SignatureRecipient[]) : [],
      auditEvents: Array.isArray(record.data.audit_events) ? (record.data.audit_events as Array<Record<string, unknown>>) : [],
    };
  },
  async resendRequest(record: SignatureProviderRecord): Promise<Partial<ProviderResponse>> {
    return {
      provider: record.provider,
      providerRequestId: String(record.data.provider_request_id ?? record.id),
      status: record.status === 'completed' ? 'completed' : 'sent',
      recipients: Array.isArray(record.data.recipients) ? (record.data.recipients as SignatureRecipient[]) : [],
      auditEvents: [buildAuditEvent('sent', 'Signature reminder sent.')],
    };
  },
  async cancelRequest(record: SignatureProviderRecord): Promise<Partial<ProviderResponse>> {
    return {
      provider: record.provider,
      providerRequestId: String(record.data.provider_request_id ?? record.id),
      status: 'cancelled',
      recipients: Array.isArray(record.data.recipients) ? (record.data.recipients as SignatureRecipient[]) : [],
      auditEvents: [buildAuditEvent('cancelled', 'Signature request cancelled.')],
    };
  },
};

export function getSignatureProvider() {
  switch (env.SIGNATURE_PROVIDER) {
    case 'dropbox_sign':
    case 'docusign':
      return internalProvider;
    default:
      return internalProvider;
  }
}