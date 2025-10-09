import axios from "axios";
import logger from "../utils/loggerUtils.js";

export interface USPSAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  zipPlus4?: string;
}

export interface USPSPackage {
  weight: number; // in ounces
  dimensions: {
    length: number; // in inches
    width: number;
    height: number;
  };
}

export interface USPSRate {
  service: string;
  serviceCode: string;
  cost: number;
  estimatedDays: number;
  trackingAvailable: boolean;
  description: string;
}

export interface USPSLabel {
  trackingNumber: string;
  labelUrl: string;
  trackingUrl: string;
  cost: number;
  service: string;
}

export interface USPSTrackingEvent {
  status: string;
  location: string;
  timestamp: Date;
  description: string;
}

export interface USPSTrackingInfo {
  trackingNumber: string;
  status: string;
  location: string;
  estimatedDelivery?: Date;
  events: USPSTrackingEvent[];
}

export class USPSService {
  private static readonly API_URL = process.env.USPS_API_URL || "https://secure.shippingapis.com/ShippingAPI.dll";
  private static readonly USER_ID = process.env.USPS_USER_ID;
  private static readonly PASSWORD = process.env.USPS_PASSWORD;
  private static readonly TEST_MODE = process.env.USPS_TEST_MODE === "true";

  /**
   * Validate USPS configuration
   */
  private static validateConfig(): void {
    if (!this.USER_ID || !this.PASSWORD) {
      throw new Error("USPS credentials not configured. Please set USPS_USER_ID and USPS_PASSWORD environment variables.");
    }
  }

  /**
   * Make USPS API request
   */
  private static async makeUSPSRequest(apiName: string, requestData: Record<string, unknown>): Promise<string> {
    this.validateConfig();

    try {
      const params = new URLSearchParams({
        API: apiName,
        XML: this.buildXMLRequest(apiName, requestData)
      });

      const response = await axios.get(`${this.API_URL}?${params.toString()}`, {
        timeout: 30000,
        headers: {
          "User-Agent": "Sufism-Ecommerce/1.0"
        }
      });

      return String(response.data);
    } catch (error) {
      logger.error(`USPS API request failed: ${String(error)}`);
      throw new Error(`USPS API request failed: ${String(error)}`);
    }
  }

  /**
   * Build XML request for USPS API
   */
  private static buildXMLRequest(apiName: string, requestData: Record<string, unknown>): string {
    const userId = this.USER_ID;
    const password = this.PASSWORD;

    if (!userId || !password) {
      throw new Error("USPS credentials not configured");
    }

    switch (apiName) {
      case "RateV4":
        return this.buildRateRequestXML(userId, password, requestData);
      case "AddressValidate":
        return this.buildAddressValidationXML(userId, password, requestData);
      case "TrackV2":
        return this.buildTrackingXML(userId, password, requestData);
      case "LabelV4":
        return this.buildLabelXML(userId, password, requestData);
      default:
        throw new Error(`Unknown USPS API: ${apiName}`);
    }
  }

  /**
   * Build RateV4 XML request
   */
  private static buildRateRequestXML(userId: string, password: string, requestData: Record<string, unknown>): string {
    const { originZip, destinationZip, weight, dimensions, serviceType } = requestData;
    const service = typeof serviceType === "string" ? serviceType : "PRIORITY";
    const origin = typeof originZip === "string" ? originZip : "";
    const destination = typeof destinationZip === "string" ? destinationZip : "";
    const weightValue = typeof weight === "number" ? weight : 0;
    const dims =
      dimensions && typeof dimensions === "object" && "width" in dimensions && "length" in dimensions && "height" in dimensions
        ? (dimensions as { width: number; length: number; height: number })
        : { width: 0, length: 0, height: 0 };

    return `<?xml version="1.0" encoding="UTF-8"?>
<RateV4Request USERID="${userId}" PASSWORD="${password}">
  <Revision>2</Revision>
  <Package ID="1">
    <Service>${service}</Service>
    <ZipOrigination>${origin}</ZipOrigination>
    <ZipDestination>${destination}</ZipDestination>
    <Pounds>${Math.floor(weightValue / 16)}</Pounds>
    <Ounces>${weightValue % 16}</Ounces>
    <Container>VARIABLE</Container>
    <Size>REGULAR</Size>
    <Width>${dims.width}</Width>
    <Length>${dims.length}</Length>
    <Height>${dims.height}</Height>
    <Girth>0</Girth>
    <Machinable>TRUE</Machinable>
  </Package>
</RateV4Request>`;
  }

  /**
   * Build AddressValidate XML request
   */
  private static buildAddressValidationXML(userId: string, password: string, requestData: Record<string, unknown>): string {
    const { address } = requestData;

    if (!address || typeof address !== "object") {
      throw new Error("Invalid address data");
    }

    const addr = address as USPSAddress;

    return `<?xml version="1.0" encoding="UTF-8"?>
<AddressValidateRequest USERID="${userId}" PASSWORD="${password}">
  <Revision>1</Revision>
  <Address ID="1">
    <Address1>${addr.address1}</Address1>
    <Address2>${addr.address2 || ""}</Address2>
    <City>${addr.city}</City>
    <State>${addr.state}</State>
    <Zip5>${addr.zip}</Zip5>
    <Zip4>${addr.zipPlus4 || ""}</Zip4>
  </Address>
</AddressValidateRequest>`;
  }

  /**
   * Build TrackV2 XML request
   */
  private static buildTrackingXML(userId: string, password: string, requestData: Record<string, unknown>): string {
    const { trackingNumber } = requestData;
    const tracking = typeof trackingNumber === "string" ? trackingNumber : "";

    return `<?xml version="1.0" encoding="UTF-8"?>
<TrackRequest USERID="${userId}" PASSWORD="${password}">
  <TrackID ID="${tracking}"></TrackID>
</TrackRequest>`;
  }

  /**
   * Build LabelV4 XML request
   */
  private static buildLabelXML(userId: string, password: string, requestData: Record<string, unknown>): string {
    const { fromAddress, toAddress, weight, dimensions, serviceType } = requestData;

    if (!fromAddress || !toAddress || typeof fromAddress !== "object" || typeof toAddress !== "object") {
      throw new Error("Invalid address data for label generation");
    }

    const from = fromAddress as USPSAddress;
    const to = toAddress as USPSAddress;
    const weightValue = typeof weight === "number" ? weight : 0;
    const service = typeof serviceType === "string" ? serviceType : "PRIORITY";
    const dims =
      dimensions && typeof dimensions === "object" && "width" in dimensions && "length" in dimensions && "height" in dimensions
        ? (dimensions as { width: number; length: number; height: number })
        : { width: 0, length: 0, height: 0 };

    return `<?xml version="1.0" encoding="UTF-8"?>
<LabelV4Request USERID="${userId}" PASSWORD="${password}">
  <Revision>2</Revision>
  <ImageParameters>
    <ImageParameter>PDF</ImageParameter>
  </ImageParameters>
  <FromName>${from.name}</FromName>
  <FromFirm>${from.address1}</FromFirm>
  <FromAddress1>${from.address2 || ""}</FromAddress1>
  <FromAddress2></FromAddress2>
  <FromCity>${from.city}</FromCity>
  <FromState>${from.state}</FromState>
  <FromZip5>${from.zip}</FromZip5>
  <FromZip4>${from.zipPlus4 || ""}</FromZip4>
  <ToName>${to.name}</ToName>
  <ToFirm>${to.address1}</ToFirm>
  <ToAddress1>${to.address2 || ""}</ToAddress1>
  <ToAddress2></ToAddress2>
  <ToCity>${to.city}</ToCity>
  <ToState>${to.state}</ToState>
  <ToZip5>${to.zip}</ToZip5>
  <ToZip4>${to.zipPlus4 || ""}</ToZip4>
  <WeightInOunces>${weightValue}</WeightInOunces>
  <ServiceType>${service}</ServiceType>
  <Container>VARIABLE</Container>
  <Size>REGULAR</Size>
  <Width>${dims.width}</Width>
  <Length>${dims.length}</Length>
  <Height>${dims.height}</Height>
  <Machinable>TRUE</Machinable>
</LabelV4Request>`;
  }

  /**
   * Parse USPS RateV4 response
   */
  private static parseRateResponse(xmlResponse: string): USPSRate[] {
    try {
      // In a real implementation, you would use an XML parser like xml2js
      // For now, we'll extract basic information using regex
      const rates: USPSRate[] = [];

      // Extract service information
      const serviceMatch = xmlResponse.match(/<Service>([^<]+)<\/Service>/);
      const costMatch = xmlResponse.match(/<Rate>([^<]+)<\/Rate>/);

      if (serviceMatch && costMatch) {
        const service = serviceMatch[1];
        const cost = parseFloat(costMatch[1]);

        rates.push({
          service: this.getServiceDisplayName(service),
          serviceCode: service,
          cost: cost,
          estimatedDays: this.getEstimatedDays(service),
          trackingAvailable: true,
          description: this.getServiceDescription(service)
        });
      }

      return rates;
    } catch (error) {
      logger.error(`Error parsing USPS rate response: ${String(error)}`);
      return [];
    }
  }

  /**
   * Parse USPS AddressValidate response
   */
  private static parseAddressValidationResponse(xmlResponse: string): USPSAddress | null {
    try {
      // Extract validated address information
      const address1Match = xmlResponse.match(/<Address1>([^<]+)<\/Address1>/);
      const address2Match = xmlResponse.match(/<Address2>([^<]+)<\/Address2>/);
      const cityMatch = xmlResponse.match(/<City>([^<]+)<\/City>/);
      const stateMatch = xmlResponse.match(/<State>([^<]+)<\/State>/);
      const zip5Match = xmlResponse.match(/<Zip5>([^<]+)<\/Zip5>/);
      const zip4Match = xmlResponse.match(/<Zip4>([^<]+)<\/Zip4>/);

      if (address1Match && cityMatch && stateMatch && zip5Match) {
        return {
          name: "",
          address1: address1Match[1],
          address2: address2Match ? address2Match[1] : undefined,
          city: cityMatch[1],
          state: stateMatch[1],
          zip: zip5Match[1],
          zipPlus4: zip4Match ? zip4Match[1] : undefined
        };
      }

      return null;
    } catch (error) {
      logger.error(`Error parsing USPS address validation response: ${String(error)}`);
      return null;
    }
  }

  /**
   * Parse USPS TrackV2 response
   */
  private static parseTrackingResponse(xmlResponse: string): USPSTrackingInfo | null {
    try {
      const trackingNumberMatch = xmlResponse.match(/<TrackID ID="([^"]+)"/);
      const statusMatch = xmlResponse.match(/<Status>([^<]+)<\/Status>/);
      const locationMatch = xmlResponse.match(/<City>([^<]+)<\/City>/);

      if (trackingNumberMatch && statusMatch) {
        return {
          trackingNumber: trackingNumberMatch[1],
          status: statusMatch[1],
          location: locationMatch ? locationMatch[1] : "",
          events: [] // Would parse events from XML in real implementation
        };
      }

      return null;
    } catch (error) {
      logger.error(`Error parsing USPS tracking response: ${String(error)}`);
      return null;
    }
  }

  /**
   * Parse USPS LabelV4 response
   */
  private static parseLabelResponse(xmlResponse: string): USPSLabel | null {
    try {
      const trackingNumberMatch = xmlResponse.match(/<TrackingNumber>([^<]+)<\/TrackingNumber>/);
      const labelUrlMatch = xmlResponse.match(/<LabelImage>([^<]+)<\/LabelImage>/);
      const costMatch = xmlResponse.match(/<Postage>([^<]+)<\/Postage>/);
      const serviceMatch = xmlResponse.match(/<Service>([^<]+)<\/Service>/);

      if (trackingNumberMatch && labelUrlMatch && costMatch && serviceMatch) {
        return {
          trackingNumber: trackingNumberMatch[1],
          labelUrl: labelUrlMatch[1],
          trackingUrl: `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingNumberMatch[1]}`,
          cost: parseFloat(costMatch[1]),
          service: this.getServiceDisplayName(serviceMatch[1])
        };
      }

      return null;
    } catch (error) {
      logger.error(`Error parsing USPS label response: ${String(error)}`);
      return null;
    }
  }

  /**
   * Get service display name
   */
  private static getServiceDisplayName(serviceCode: string): string {
    const serviceNames: Record<string, string> = {
      PRIORITY: "Priority Mail",
      PRIORITY_EXPRESS: "Priority Mail Express",
      FIRST_CLASS: "First-Class Mail",
      GROUND_ADVANTAGE: "Ground Advantage",
      MEDIA_MAIL: "Media Mail",
      RETAIL_GROUND: "Retail Ground"
    };

    return serviceNames[serviceCode] || serviceCode;
  }

  /**
   * Get estimated delivery days
   */
  private static getEstimatedDays(serviceCode: string): number {
    const estimatedDays: Record<string, number> = {
      PRIORITY: 2,
      PRIORITY_EXPRESS: 1,
      FIRST_CLASS: 3,
      GROUND_ADVANTAGE: 4,
      MEDIA_MAIL: 7,
      RETAIL_GROUND: 8
    };

    return estimatedDays[serviceCode] || 3;
  }

  /**
   * Get service description
   */
  private static getServiceDescription(serviceCode: string): string {
    const descriptions: Record<string, string> = {
      PRIORITY: "Fast, reliable delivery in 1-3 business days",
      PRIORITY_EXPRESS: "Overnight delivery in 1-2 business days",
      FIRST_CLASS: "Affordable delivery in 1-3 business days",
      GROUND_ADVANTAGE: "Economical delivery in 2-5 business days",
      MEDIA_MAIL: "Low-cost shipping for books, CDs, and DVDs",
      RETAIL_GROUND: "Economical delivery for heavy packages"
    };

    return descriptions[serviceCode] || "USPS shipping service";
  }

  /**
   * Calculate shipping rates
   */
  static async calculateRates(params: {
    originZip: string;
    destinationZip: string;
    weight: number; // in ounces
    dimensions?: { length: number; width: number; height: number };
    serviceType?: string;
  }): Promise<USPSRate[]> {
    try {
      if (this.TEST_MODE) {
        // Return mock data for testing
        return this.getMockRates(params);
      }

      const xmlResponse = await this.makeUSPSRequest("RateV4", {
        originZip: params.originZip,
        destinationZip: params.destinationZip,
        weight: params.weight,
        dimensions: params.dimensions,
        serviceType: params.serviceType || "PRIORITY"
      });

      return this.parseRateResponse(xmlResponse);
    } catch (error) {
      logger.error(`Error calculating USPS rates: ${String(error)}`);
      // Fallback to mock data on error
      return this.getMockRates(params);
    }
  }

  /**
   * Validate address
   */
  static async validateAddress(address: USPSAddress): Promise<USPSAddress | null> {
    try {
      if (this.TEST_MODE) {
        // Return mock validation for testing
        return this.getMockAddressValidation(address);
      }

      const xmlResponse = await this.makeUSPSRequest("AddressValidate", { address });

      return this.parseAddressValidationResponse(xmlResponse);
    } catch (error) {
      logger.error(`Error validating USPS address: ${String(error)}`);
      return null;
    }
  }

  /**
   * Track package
   */
  static async trackPackage(trackingNumber: string): Promise<USPSTrackingInfo | null> {
    try {
      if (this.TEST_MODE) {
        // Return mock tracking for testing
        return this.getMockTracking(trackingNumber);
      }

      const xmlResponse = await this.makeUSPSRequest("TrackV2", { trackingNumber });

      return this.parseTrackingResponse(xmlResponse);
    } catch (error) {
      logger.error(`Error tracking USPS package: ${String(error)}`);
      return null;
    }
  }

  /**
   * Generate shipping label
   */
  static async generateLabel(params: {
    fromAddress: USPSAddress;
    toAddress: USPSAddress;
    weight: number; // in ounces
    dimensions?: { length: number; width: number; height: number };
    serviceType?: string;
  }): Promise<USPSLabel | null> {
    try {
      if (this.TEST_MODE) {
        // Return mock label for testing
        return this.getMockLabel(params);
      }

      const xmlResponse = await this.makeUSPSRequest("LabelV4", params);

      return this.parseLabelResponse(xmlResponse);
    } catch (error) {
      logger.error(`Error generating USPS label: ${String(error)}`);
      return null;
    }
  }

  /**
   * Get mock rates for testing
   */
  private static getMockRates(params: { weight: number; serviceType?: string }): USPSRate[] {
    const baseRate = Math.max(3.5, params.weight * 0.15);
    const serviceType = params.serviceType || "PRIORITY";

    const mockRates: USPSRate[] = [
      {
        service: "Priority Mail",
        serviceCode: "PRIORITY",
        cost: baseRate + 4.45,
        estimatedDays: 2,
        trackingAvailable: true,
        description: "Fast, reliable delivery in 1-3 business days"
      },
      {
        service: "First-Class Mail",
        serviceCode: "FIRST_CLASS",
        cost: baseRate + 1.5,
        estimatedDays: 3,
        trackingAvailable: true,
        description: "Affordable delivery in 1-3 business days"
      },
      {
        service: "Ground Advantage",
        serviceCode: "GROUND_ADVANTAGE",
        cost: baseRate + 0.5,
        estimatedDays: 4,
        trackingAvailable: true,
        description: "Economical delivery in 2-5 business days"
      }
    ];

    return mockRates.filter((rate) => !serviceType || rate.serviceCode === serviceType);
  }

  /**
   * Get mock address validation for testing
   */
  private static getMockAddressValidation(address: USPSAddress): USPSAddress {
    return {
      ...address,
      zipPlus4: "1234" // Mock ZIP+4
    };
  }

  /**
   * Get mock tracking for testing
   */
  private static getMockTracking(trackingNumber: string): USPSTrackingInfo {
    return {
      trackingNumber,
      status: "In Transit",
      location: "Distribution Center",
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      events: [
        {
          status: "Accepted",
          location: "Origin Facility",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          description: "Package accepted at origin facility"
        },
        {
          status: "In Transit",
          location: "Distribution Center",
          timestamp: new Date(),
          description: "Package in transit to destination"
        }
      ]
    };
  }

  /**
   * Get mock label for testing
   */
  private static getMockLabel(params: { weight: number; serviceType?: string }): USPSLabel {
    const trackingNumber = `USPS${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const serviceType = params.serviceType || "PRIORITY";

    return {
      trackingNumber,
      labelUrl: `https://mock-usps-labels.com/label/${trackingNumber}.pdf`,
      trackingUrl: `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingNumber}`,
      cost: Math.max(3.5, params.weight * 0.15) + 4.45,
      service: this.getServiceDisplayName(serviceType)
    };
  }
}
