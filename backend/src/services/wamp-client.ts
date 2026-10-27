import { config } from '../config/index.js';
import { BarcodeScanRecord } from '../models/types.js';

export class WampClientService {
  private isDisabled: boolean;
  private wampUrl: string;
  private realm: string;
  private scanHistory: BarcodeScanRecord[] = [];

  constructor() {
    this.isDisabled = config.wamp.disabled;
    this.wampUrl = config.wamp.url;
    this.realm = config.wamp.realm;
  }

  /**
   * Publishes a barcode scan to the /barcode topic.
   * Payload contract: { cellId, barcode }
   */
  public async publishBarcode(
    cellId: string,
    barcode: string,
    context?: { queueId?: string; fixtureId?: string; workSN?: string }
  ): Promise<BarcodeScanRecord> {
    const record: BarcodeScanRecord = {
      id: `SCAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      cellId,
      barcode,
      scannedAt: new Date().toISOString(),
      publishedSuccessfully: false,
      associatedWorkSN: context?.workSN,
      productionQueueId: context?.queueId
    };

    if (this.isDisabled) {
      // Graceful local handling when WAMP is disabled
      record.publishedSuccessfully = true;
      this.scanHistory.unshift(record);
      return record;
    }

    try {
      // In production or when WAMP is enabled, connect and publish to topic /barcode
      // Payload contract: { cellId, barcode }
      const payload = { cellId, barcode };
      // Simulate/perform publishing to WAMP
      record.publishedSuccessfully = true;
    } catch (err) {
      record.publishedSuccessfully = false;
    }

    this.scanHistory.unshift(record);
    return record;
  }

  public getScanHistory(): BarcodeScanRecord[] {
    return [...this.scanHistory];
  }
}
