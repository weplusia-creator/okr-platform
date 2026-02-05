import { parseStringPromise } from 'xml2js';

// WSFEV1 (Factura Electronica) service URLs
const WSFEV1_URLS = {
  testing: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  production: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
};

export interface IVADetail {
  /** IVA rate ID (5 = 21%, 4 = 10.5%, 6 = 27%, etc.) */
  id: number;
  /** Tax base amount */
  baseImp: number;
  /** IVA amount */
  importe: number;
}

export interface FECAERequestParams {
  puntoVenta: number;
  /** Invoice type (1=Factura A, 6=Factura B, 11=Factura C, etc.) */
  tipoComprobante: number;
  /** Concept (1=productos, 2=servicios, 3=productos y servicios) */
  concepto: number;
  /** Document type (80=CUIT, 86=CUIL, 96=DNI, 99=consumidor final) */
  docTipo: number;
  /** Document number */
  docNro: string;
  /** Invoice number start */
  cbteDesde: number;
  /** Invoice number end */
  cbteHasta: number;
  /** Invoice date in YYYYMMDD format */
  cbteFecha: string;
  /** Total amount */
  impTotal: number;
  /** Non-taxable total */
  impTotConc: number;
  /** Net taxable amount */
  impNeto: number;
  /** Tax-exempt amount */
  impOpEx: number;
  /** Tributes amount */
  impTrib: number;
  /** IVA total */
  impIVA: number;
  /** IVA breakdown details */
  ivaDetails: IVADetail[];
  /** Service start date YYYYMMDD (required for concepto 2 or 3) */
  fchServDesde?: string;
  /** Service end date YYYYMMDD (required for concepto 2 or 3) */
  fchServHasta?: string;
  /** Payment due date YYYYMMDD (required for concepto 2 or 3) */
  fchVtoPago?: string;
}

export interface FECAEResponse {
  success: boolean;
  cae: string | null;
  caeVencimiento: string | null;
  numeroComprobante: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  observations: string[];
  requestXml: string;
  responseXml: string;
}

export class WSFEV1Client {
  private token: string;
  private sign: string;
  private cuit: string;
  private environment: 'testing' | 'production';
  private serviceUrl: string;

  constructor(
    token: string,
    sign: string,
    cuit: string,
    environment: 'testing' | 'production'
  ) {
    this.token = token;
    this.sign = sign;
    this.cuit = cuit;
    this.environment = environment;
    this.serviceUrl = WSFEV1_URLS[this.environment];
  }

  /**
   * Gets the last authorized invoice number for the given punto de venta and invoice type.
   */
  async getUltimoAutorizado(puntoVenta: number, tipoComprobante: number): Promise<number> {
    const soapBody = this.buildFECompUltimoAutorizado(puntoVenta, tipoComprobante);
    const responseXml = await this.callService(
      'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado',
      soapBody
    );

    const result = await parseStringPromise(responseXml, { explicitArray: false });
    const envelope = result['soap:Envelope'] || result['soapenv:Envelope'] || result['Envelope'];
    const body = envelope['soap:Body'] || envelope['soapenv:Body'] || envelope['Body'];
    const response = body['FECompUltimoAutorizadoResponse']?.['FECompUltimoAutorizadoResult'];

    if (!response) {
      throw new Error('Invalid FECompUltimoAutorizado response');
    }

    // Check for errors
    if (response['Errors']) {
      const err = response['Errors']['Err'];
      const errMsg = Array.isArray(err)
        ? err.map((e: any) => `${e['Code']}: ${e['Msg']}`).join('; ')
        : `${err['Code']}: ${err['Msg']}`;
      throw new Error(`ARCA error in FECompUltimoAutorizado: ${errMsg}`);
    }

    return parseInt(response['CbteNro'], 10);
  }

  /**
   * Emits an electronic invoice via FECAESolicitar.
   */
  async emitInvoice(params: FECAERequestParams): Promise<FECAEResponse> {
    const requestXml = this.buildFECAESolicitar(params);
    let responseXml: string;

    try {
      responseXml = await this.callService(
        'http://ar.gov.afip.dif.FEV1/FECAESolicitar',
        requestXml
      );
    } catch (error: any) {
      return {
        success: false,
        cae: null,
        caeVencimiento: null,
        numeroComprobante: params.cbteDesde,
        errorCode: 'NETWORK_ERROR',
        errorMessage: error.message,
        observations: [],
        requestXml,
        responseXml: '',
      };
    }

    return this.parseFECAEResponse(responseXml, requestXml);
  }

  /**
   * Builds the SOAP envelope for FECAESolicitar.
   */
  private buildFECAESolicitar(params: FECAERequestParams): string {
    // Build IVA array XML
    let ivaXml = '';
    if (params.ivaDetails && params.ivaDetails.length > 0) {
      const ivaItems = params.ivaDetails
        .map(
          (iva) => `
              <AlicIva>
                <Id>${iva.id}</Id>
                <BaseImp>${iva.baseImp.toFixed(2)}</BaseImp>
                <Importe>${iva.importe.toFixed(2)}</Importe>
              </AlicIva>`
        )
        .join('');
      ivaXml = `<Iva>${ivaItems}
            </Iva>`;
    }

    // Service dates (required for concepto 2 or 3)
    let serviceDatesXml = '';
    if (params.concepto === 2 || params.concepto === 3) {
      serviceDatesXml = `
              <FchServDesde>${params.fchServDesde || params.cbteFecha}</FchServDesde>
              <FchServHasta>${params.fchServHasta || params.cbteFecha}</FchServHasta>
              <FchVtoPago>${params.fchVtoPago || params.cbteFecha}</FchVtoPago>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soap:Header/>
  <soap:Body>
    <ar:FECAESolicitar>
      <ar:Auth>
        <ar:Token>${this.token}</ar:Token>
        <ar:Sign>${this.sign}</ar:Sign>
        <ar:Cuit>${this.cuit}</ar:Cuit>
      </ar:Auth>
      <ar:FeCAEReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${params.puntoVenta}</ar:PtoVta>
          <ar:CbteTipo>${params.tipoComprobante}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEDetRequest>
            <ar:Concepto>${params.concepto}</ar:Concepto>
            <ar:DocTipo>${params.docTipo}</ar:DocTipo>
            <ar:DocNro>${params.docNro}</ar:DocNro>
            <ar:CbteDesde>${params.cbteDesde}</ar:CbteDesde>
            <ar:CbteHasta>${params.cbteHasta}</ar:CbteHasta>
            <ar:CbteFch>${params.cbteFecha}</ar:CbteFch>
            <ar:ImpTotal>${params.impTotal.toFixed(2)}</ar:ImpTotal>
            <ar:ImpTotConc>${params.impTotConc.toFixed(2)}</ar:ImpTotConc>
            <ar:ImpNeto>${params.impNeto.toFixed(2)}</ar:ImpNeto>
            <ar:ImpOpEx>${params.impOpEx.toFixed(2)}</ar:ImpOpEx>
            <ar:ImpTrib>${params.impTrib.toFixed(2)}</ar:ImpTrib>
            <ar:ImpIVA>${params.impIVA.toFixed(2)}</ar:ImpIVA>
            <ar:MonId>PES</ar:MonId>
            <ar:MonCotiz>1</ar:MonCotiz>${serviceDatesXml}
            ${ivaXml}
          </ar:FECAEDetRequest>
        </ar:FeDetReq>
      </ar:FeCAEReq>
    </ar:FECAESolicitar>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Builds the SOAP envelope for FECompUltimoAutorizado.
   */
  private buildFECompUltimoAutorizado(puntoVenta: number, tipoComprobante: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soap:Header/>
  <soap:Body>
    <ar:FECompUltimoAutorizado>
      <ar:Auth>
        <ar:Token>${this.token}</ar:Token>
        <ar:Sign>${this.sign}</ar:Sign>
        <ar:Cuit>${this.cuit}</ar:Cuit>
      </ar:Auth>
      <ar:PtoVta>${puntoVenta}</ar:PtoVta>
      <ar:CbteTipo>${tipoComprobante}</ar:CbteTipo>
    </ar:FECompUltimoAutorizado>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Sends a SOAP request to the WSFEV1 service.
   */
  private async callService(action: string, body: string): Promise<string> {
    const response = await fetch(this.serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': action,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WSFEV1 request failed (HTTP ${response.status}): ${errorText}`);
    }

    return response.text();
  }

  /**
   * Parses the FECAESolicitar SOAP response.
   */
  private async parseFECAEResponse(responseXml: string, requestXml: string): Promise<FECAEResponse> {
    const result = await parseStringPromise(responseXml, { explicitArray: false });

    const envelope = result['soap:Envelope'] || result['soapenv:Envelope'] || result['Envelope'];
    if (!envelope) {
      return {
        success: false,
        cae: null,
        caeVencimiento: null,
        numeroComprobante: null,
        errorCode: 'PARSE_ERROR',
        errorMessage: 'Invalid SOAP response: missing envelope',
        observations: [],
        requestXml,
        responseXml,
      };
    }

    const body = envelope['soap:Body'] || envelope['soapenv:Body'] || envelope['Body'];
    const feResponse = body['FECAESolicitarResponse']?.['FECAESolicitarResult'];

    if (!feResponse) {
      return {
        success: false,
        cae: null,
        caeVencimiento: null,
        numeroComprobante: null,
        errorCode: 'PARSE_ERROR',
        errorMessage: 'Invalid FECAESolicitar response structure',
        observations: [],
        requestXml,
        responseXml,
      };
    }

    // Collect observations
    const observations: string[] = [];

    // Check header-level errors
    if (feResponse['Errors']) {
      const err = feResponse['Errors']['Err'];
      const errors = Array.isArray(err) ? err : [err];
      const errorCode = errors[0]?.['Code'] || 'UNKNOWN';
      const errorMessage = errors.map((e: any) => `${e['Code']}: ${e['Msg']}`).join('; ');
      return {
        success: false,
        cae: null,
        caeVencimiento: null,
        numeroComprobante: null,
        errorCode: String(errorCode),
        errorMessage,
        observations,
        requestXml,
        responseXml,
      };
    }

    // Process detail response
    const detResponse = feResponse['FeDetResp']?.['FECAEDetResponse'];
    if (!detResponse) {
      return {
        success: false,
        cae: null,
        caeVencimiento: null,
        numeroComprobante: null,
        errorCode: 'PARSE_ERROR',
        errorMessage: 'Missing FECAEDetResponse in response',
        observations,
        requestXml,
        responseXml,
      };
    }

    // Get the first (and usually only) detail
    const det = Array.isArray(detResponse) ? detResponse[0] : detResponse;

    // Collect observations from the detail
    if (det['Observaciones']) {
      const obs = det['Observaciones']['Obs'];
      const obsList = Array.isArray(obs) ? obs : [obs];
      for (const o of obsList) {
        if (o) {
          observations.push(`${o['Code']}: ${o['Msg']}`);
        }
      }
    }

    const resultado = det['Resultado'];
    const isApproved = resultado === 'A'; // A = Aprobado, R = Rechazado

    if (!isApproved) {
      return {
        success: false,
        cae: null,
        caeVencimiento: null,
        numeroComprobante: det['CbteDesde'] ? parseInt(det['CbteDesde'], 10) : null,
        errorCode: resultado === 'R' ? 'REJECTED' : 'UNKNOWN',
        errorMessage: observations.length > 0
          ? observations.join('; ')
          : 'Invoice was rejected by ARCA',
        observations,
        requestXml,
        responseXml,
      };
    }

    return {
      success: true,
      cae: det['CAE'] || null,
      caeVencimiento: det['CAEFchVto'] || null,
      numeroComprobante: det['CbteDesde'] ? parseInt(det['CbteDesde'], 10) : null,
      errorCode: null,
      errorMessage: null,
      observations,
      requestXml,
      responseXml,
    };
  }
}
