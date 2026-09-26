const environment = import.meta.env;

export const legalDetails = {
  entityName: environment.VITE_LEGAL_ENTITY_NAME || '',
  contactEmail: environment.VITE_LEGAL_CONTACT_EMAIL || '',
  businessAddress: environment.VITE_LEGAL_BUSINESS_ADDRESS || '',
  publicAppUrl: environment.VITE_PUBLIC_APP_URL || '',
  effectiveDate: environment.VITE_LEGAL_EFFECTIVE_DATE || '26 September 2026',
};

export const legalConfigurationComplete = Boolean(
  legalDetails.entityName
  && legalDetails.contactEmail
  && legalDetails.businessAddress
  && legalDetails.publicAppUrl.startsWith('https://'),
);

export const LEGAL_POLICY_VERSION = environment.VITE_LEGAL_POLICY_VERSION || '2026-09-26';
