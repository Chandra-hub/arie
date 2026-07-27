import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import pino from 'pino';
import { getJurisdiction } from '../config/jurisdictions';
import { ScrapedContent } from '../types/agent.types';

const logger = pino({ name: 'scraper' });

const httpClient = axios.create({
  timeout: 30_000,
  headers: {
    'User-Agent':
      'ARIE-RegulatoryBot/1.0 (Regulatory Compliance Monitoring; contact@yourcompany.com)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  },
});

export async function fetchJurisdictionContent(
  jurisdictionCode: string,
): Promise<ScrapedContent[]> {
  const jurisdiction = getJurisdiction(jurisdictionCode);
  if (!jurisdiction) {
    throw new Error(`Unknown jurisdiction: ${jurisdictionCode}`);
  }

  const results: ScrapedContent[] = [];

  for (const regulatoryUrl of jurisdiction.regulatoryUrls) {
    try {
      logger.info({ jurisdictionCode, url: regulatoryUrl.url }, 'Fetching regulatory content');

      const response = await httpClient.get<string>(regulatoryUrl.url);
      const $ = cheerio.load(response.data);

      // Extract targeted content if a CSS selector is defined, else use full body
      let textContent: string;
      if (regulatoryUrl.selector) {
        textContent = $(regulatoryUrl.selector).text().replace(/\s+/g, ' ').trim();
      } else {
        // Remove nav, footer, script, style before extracting text
        $('nav, footer, script, style, header').remove();
        textContent = $('body').text().replace(/\s+/g, ' ').trim();
      }

      results.push({
        jurisdictionCode,
        url: regulatoryUrl.url,
        rawHtml: response.data,
        textContent,
        fetchedAt: new Date(),
      });

      // Polite delay between requests to the same domain
      await sleep(1500);
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error(
        {
          jurisdictionCode,
          url: regulatoryUrl.url,
          status: axiosError.response?.status,
          message: axiosError.message,
        },
        'Failed to fetch regulatory URL',
      );
      // Continue with other URLs rather than failing the entire jurisdiction
    }
  }

  return results;
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function hashScrapedContents(contents: ScrapedContent[]): string {
  const combined = contents.map((c) => c.textContent).join('||');
  return hashContent(combined);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
