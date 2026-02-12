import forge from 'node-forge';
import { parseStringPromise } from 'xml2js';

// WSAA (Web Service de Autenticacion y Autorizacion) URLs
const WSAA_URLS = {
  testing: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  production: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
};

export interface WSAAToken {
  token: string;
  sign: string;
  generationTime: string;
  expirationTime: string;
}

export class WSAAClient {
  private certificate: string;
  private privateKey: string;
  private environment: 'testing' | 'production';
  private wsaaUrl: string;

  constructor(
    certificate: string,
    privateKey: string,
    environment: 'testing' | 'production'
  ) {
    this.certificate = certificate;
    this.privateKey = privateKey;
    this.environment = environment;
    this.wsaaUrl = WSAA_URLS[this.environment];
  }

  /**
   * Obtains a token/sign pair from WSAA for the specified service.
   */
  async getToken(service: string = 'wsfe'): Promise<WSAAToken> {
    const tra = this.createTRA(service);
    const signedTRA = this.signTRA(tra);
    const responseXml = await this.callLoginCms(signedTRA);
    return this.parseLoginResponse(responseXml);
  }

  /**
   * Creates a Login Ticket Request (TRA) XML document.
   * The TRA specifies the service being requested and a validity window.
   */
  private createTRA(service: string): string {
    const now = new Date();
    // Generation time: 10 minutes in the past to account for clock skew
    const generationTime = new Date(now.getTime() - 10 * 60 * 1000);
    // Expiration time: 12 hours from now (max allowed by WSAA is <24h)
    const expirationTime = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    const formatDate = (d: Date): string => {
      // WSAA expects ISO format with timezone offset
      // Use UTC format which WSAA accepts
      return d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
    };

    return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
    <generationTime>${formatDate(generationTime)}</generationTime>
    <expirationTime>${formatDate(expirationTime)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
  }

  /**
   * Signs the TRA using the certificate and private key (CMS/PKCS#7 signature).
   * Returns the signed CMS as a base64 string.
   */
  private signTRA(tra: string): string {
    // Parse the certificate
    const cert = forge.pki.certificateFromPem(this.certificate);
    // Parse the private key
    const key = forge.pki.privateKeyFromPem(this.privateKey);

    // Create PKCS#7 signed data
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(tra, 'utf8');

    p7.addCertificate(cert);
    p7.addSigner({
      key: key,
      certificate: cert,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data,
        },
        {
          type: forge.pki.oids.messageDigest,
          // value will be auto-populated at signing time
        },
        {
          type: forge.pki.oids.signingTime,
          value: new Date() as any,
        },
      ],
    });

    p7.sign();

    // Convert to DER and then base64
    const asn1 = p7.toAsn1();
    const derBytes = forge.asn1.toDer(asn1);
    return forge.util.encode64(derBytes.getBytes());
  }

  /**
   * Calls the WSAA LoginCms web service with the signed TRA.
   */
  private async callLoginCms(signedTRA: string): Promise<string> {
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${signedTRA}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(this.wsaaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '""',
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WSAA LoginCms failed (HTTP ${response.status}): ${errorText}`);
    }

    return response.text();
  }

  /**
   * Parses the WSAA LoginCms SOAP response and extracts the credentials.
   */
  private async parseLoginResponse(xml: string): Promise<WSAAToken> {
    const result = await parseStringPromise(xml, { explicitArray: false });

    // Navigate the SOAP envelope to find the loginCmsReturn
    const envelope = result['soapenv:Envelope'] || result['soap:Envelope'] || result['Envelope'];
    if (!envelope) {
      throw new Error('Invalid WSAA response: missing SOAP envelope');
    }

    const body = envelope['soapenv:Body'] || envelope['soap:Body'] || envelope['Body'];
    if (!body) {
      throw new Error('Invalid WSAA response: missing SOAP body');
    }

    const loginResponse = body['loginCmsReturn'] ||
      body['loginCmsResponse']?.['loginCmsReturn'] ||
      body['ns1:loginCmsResponse']?.['loginCmsReturn'] ||
      body['ns2:loginCmsResponse']?.['loginCmsReturn'];

    if (!loginResponse) {
      // Check for SOAP fault
      const fault = body['soapenv:Fault'] || body['soap:Fault'] || body['Fault'];
      if (fault) {
        const faultString = fault['faultstring'] || fault['faultString'] || 'Unknown WSAA error';
        throw new Error(`WSAA SOAP Fault: ${faultString}`);
      }
      throw new Error('Invalid WSAA response: could not find loginCmsReturn');
    }

    // The loginCmsReturn contains an XML string with the credentials
    const loginTicketXml = typeof loginResponse === 'string' ? loginResponse : loginResponse._;
    const ticketResult = await parseStringPromise(loginTicketXml, { explicitArray: false });
    const credentials = ticketResult['loginTicketResponse']?.['credentials'];

    if (!credentials) {
      throw new Error('Invalid WSAA response: missing credentials in login ticket');
    }

    return {
      token: credentials['token'],
      sign: credentials['sign'],
      generationTime: ticketResult['loginTicketResponse']['header']['generationTime'],
      expirationTime: ticketResult['loginTicketResponse']['header']['expirationTime'],
    };
  }
}
