export interface RegulatoryUrl {
  url: string;
  label: string;                     // e.g. "Legislation", "Guidance", "Notices"
  selector?: string;                 // CSS selector for targeted content extraction
}

export interface JurisdictionDefinition {
  code: string;                      // ISO 3166-1 alpha-2
  name: string;
  regulatoryBodies: string[];
  regulatoryUrls: RegulatoryUrl[];
  rssFeedUrl?: string;
  sectors: string[];                 // Sectors this jurisdiction has regulation for
  language?: string;                 // ISO 639-1 language code (for normalizer hints)
}

export interface JurisdictionStatus extends JurisdictionDefinition {
  rssFeedAvailable: boolean;
  lastIndexed?: Date;
  inOrgFootprint: boolean;
}
