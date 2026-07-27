import { JurisdictionDefinition } from '../types/jurisdiction.types';

/**
 * Global jurisdiction registry.
 * Add new jurisdictions here — the agent will automatically include them
 * when an org adds the corresponding code to their footprint.
 */
export const JURISDICTION_REGISTRY: JurisdictionDefinition[] = [
  {
    code: 'GB',
    name: 'United Kingdom',
    regulatoryBodies: ['Environment Agency', 'Health and Safety Executive', 'DEFRA'],
    regulatoryUrls: [
      {
        url: 'https://www.legislation.gov.uk/browse/environmental',
        label: 'Environmental Legislation',
        selector: '.legislation-list',
      },
      {
        url: 'https://www.hse.gov.uk/legislation/',
        label: 'HSE Legislation',
        selector: '.legislation-container',
      },
    ],
    rssFeedUrl: 'https://www.legislation.gov.uk/new/rss',
    sectors: ['water', 'chemical', 'manufacturing', 'energy', 'waste'],
    language: 'en',
  },
  {
    code: 'US',
    name: 'United States',
    regulatoryBodies: ['EPA', 'OSHA', 'DOT', 'FMCSA'],
    regulatoryUrls: [
      {
        url: 'https://www.epa.gov/laws-regulations',
        label: 'EPA Laws & Regulations',
        selector: '#main-content',
      },
      {
        url: 'https://www.osha.gov/laws-regs',
        label: 'OSHA Laws & Regulations',
        selector: '#region-content',
      },
    ],
    rssFeedUrl: 'https://www.federalregister.gov/documents/search.rss?conditions%5Bagencies%5D%5B%5D=environmental-protection-agency',
    sectors: ['water', 'chemical', 'manufacturing', 'energy', 'waste', 'transportation'],
    language: 'en',
  },
  {
    code: 'AU',
    name: 'Australia',
    regulatoryBodies: ['DCCEEW', 'Safe Work Australia', 'APVMA'],
    regulatoryUrls: [
      {
        url: 'https://www.dcceew.gov.au/environment/protection/legislation',
        label: 'Environmental Protection Legislation',
        selector: '#content',
      },
    ],
    rssFeedUrl: 'https://www.legislation.gov.au/Browse/Results/ByInstitution/Commonwealth/Both/All/All/All/RSS',
    sectors: ['water', 'chemical', 'manufacturing', 'mining', 'energy'],
    language: 'en',
  },
  {
    code: 'DE',
    name: 'Germany',
    regulatoryBodies: ['Umweltbundesamt (UBA)', 'BAuA', 'Bundesrat'],
    regulatoryUrls: [
      {
        url: 'https://www.umweltbundesamt.de/themen/wasser/wasserrecht',
        label: 'Water Law',
        selector: '.field-items',
      },
      {
        url: 'https://www.gesetze-im-internet.de/krwg/',
        label: 'Waste Management Act',
      },
    ],
    sectors: ['water', 'chemical', 'manufacturing', 'waste', 'energy'],
    language: 'de',
  },
  {
    code: 'JP',
    name: 'Japan',
    regulatoryBodies: ['Ministry of Environment', 'METI'],
    regulatoryUrls: [
      {
        url: 'https://www.env.go.jp/en/laws/',
        label: 'Environmental Laws (English)',
        selector: '#main',
      },
    ],
    rssFeedUrl: 'https://www.env.go.jp/en/rss/news.rdf',
    sectors: ['water', 'chemical', 'manufacturing', 'waste'],
    language: 'ja',
  },
  {
    code: 'SG',
    name: 'Singapore',
    regulatoryBodies: ['National Environment Agency (NEA)', 'PUB', 'MOM'],
    regulatoryUrls: [
      {
        url: 'https://www.nea.gov.sg/our-services/pollution-control/chemical-safety/legislation',
        label: 'Chemical Safety Legislation',
        selector: '.content-area',
      },
      {
        url: 'https://www.pub.gov.sg/compliance/legislation',
        label: 'Water Legislation',
      },
    ],
    sectors: ['water', 'chemical', 'manufacturing', 'waste'],
    language: 'en',
  },
  {
    code: 'CA',
    name: 'Canada',
    regulatoryBodies: ['Environment and Climate Change Canada', 'Health Canada', 'Transport Canada'],
    regulatoryUrls: [
      {
        url: 'https://www.canada.ca/en/environment-climate-change/services/environmental-indicators.html',
        label: 'Environmental Regulation',
        selector: '#wb-cont',
      },
    ],
    rssFeedUrl: 'https://www.canada.ca/en/news/advanced-news-search/news-results.atom?typ=notice&dprtmnt=environment-and-climate-change-canada',
    sectors: ['water', 'chemical', 'manufacturing', 'energy', 'mining'],
    language: 'en',
  },
  {
    code: 'NL',
    name: 'Netherlands',
    regulatoryBodies: ['RIVM', 'Rijkswaterstaat', 'ILT'],
    regulatoryUrls: [
      {
        url: 'https://www.rivm.nl/en/soil-and-water/legislation-and-standards',
        label: 'Soil and Water Legislation',
        selector: '.rich-text',
      },
    ],
    sectors: ['water', 'chemical', 'manufacturing', 'waste'],
    language: 'nl',
  },
  {
    code: 'FR',
    name: 'France',
    regulatoryBodies: ['ADEME', 'DREAL', 'Ministère de la Transition Écologique'],
    regulatoryUrls: [
      {
        url: 'https://www.ecologie.gouv.fr/politique-de-prevention-des-risques-technologiques-et-naturels',
        label: 'Industrial Risk Legislation',
        selector: '.field-items',
      },
    ],
    rssFeedUrl: 'https://www.legifrance.gouv.fr/atom/jo/latest',
    sectors: ['water', 'chemical', 'manufacturing', 'energy', 'waste'],
    language: 'fr',
  },
  {
    code: 'IN',
    name: 'India',
    regulatoryBodies: ['Central Pollution Control Board (CPCB)', 'MoEFCC', 'PESO'],
    regulatoryUrls: [
      {
        url: 'https://cpcb.nic.in/introduction-of-acts-rules.php',
        label: 'CPCB Acts & Rules',
        selector: '.content-inner',
      },
    ],
    sectors: ['water', 'chemical', 'manufacturing', 'energy', 'waste'],
    language: 'en',
  },
];

export const JURISDICTION_MAP = new Map<string, JurisdictionDefinition>(
  JURISDICTION_REGISTRY.map((j) => [j.code, j]),
);

export function getJurisdiction(code: string): JurisdictionDefinition | undefined {
  return JURISDICTION_MAP.get(code.toUpperCase());
}

export function getJurisdictionsForFootprint(
  footprint: string[],
): JurisdictionDefinition[] {
  return footprint
    .map((code) => getJurisdiction(code))
    .filter((j): j is JurisdictionDefinition => j !== undefined);
}
