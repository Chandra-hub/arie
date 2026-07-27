import Anthropic from '@anthropic-ai/sdk';
import pino from 'pino';
import { env } from '../config/env';
import { ScrapedContent } from '../types/agent.types';
import { NormalizedRegulation } from '../types/regulation.types';

const logger = pino({ name: 'normalizer' });

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a regulatory intelligence analyst specializing in environmental,
chemical, water, and manufacturing compliance law. Your role is to extract structured regulatory
rules from raw government website content.

Return ONLY valid JSON — no preamble, no markdown, no explanation.

Output schema:
{
  "regulations": [
    {
      "title": "Full official name of the regulation",
      "body": "Name of the regulatory body that issued/enforces it",
      "sector": "One of: water | chemical | manufacturing | energy | waste | transportation | mining | general",
      "summary": "2-3 sentence plain-English summary of what this regulation requires",
      "keyObligations": ["Array of specific obligations", "operators must comply with"],
      "effectiveDate": "YYYY-MM-DD or YYYY if only year is known, null if unknown",
      "penaltyFramework": {
        "maxFine": numeric value in local currency or null,
        "currency": "ISO 4217 code e.g. GBP, USD, EUR",
        "criminalLiability": true/false,
        "notes": "Any additional penalty details"
      },
      "sourceUrl": "Direct URL to this specific regulation if identifiable from context"
    }
  ]
}

Rules:
- Extract ONLY regulations that are currently in force or pending implementation
- If the content is in a non-English language, extract and translate the key fields to English
- Skip navigation items, press releases, and blog posts — only extract actual legislative/regulatory rules
- If a field cannot be determined from the content, use null
- Extract each distinct regulation as a separate entry`;

export async function normalizeRegulations(
  jurisdictionCode: string,
  sectors: string[],
  scrapedContents: ScrapedContent[],
): Promise<NormalizedRegulation[]> {
  if (scrapedContents.length === 0) return [];

  // Combine text content from all scraped URLs for this jurisdiction
  const combinedContent = scrapedContents
    .map((c) => `=== Source: ${c.url} ===\n${c.textContent}`)
    .join('\n\n');

  // Guard against excessively large content (Claude token limits)
  const truncatedContent =
    combinedContent.length > 60_000
      ? combinedContent.slice(0, 60_000) + '\n[Content truncated for processing]'
      : combinedContent;

  logger.info(
    { jurisdictionCode, contentLength: truncatedContent.length },
    'Sending content to Claude for normalization',
  );

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Jurisdiction: ${jurisdictionCode}
Relevant sectors for this organization: ${sectors.join(', ')}

Extract all current regulatory rules from the following government website content:

${truncatedContent}`,
        },
      ],
    });

    const rawText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Strip any accidental markdown fences
    const cleanJson = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const parsed = JSON.parse(cleanJson) as { regulations: NormalizedRegulation[] };

    logger.info(
      { jurisdictionCode, regulationCount: parsed.regulations.length },
      'Normalization complete',
    );

    return parsed.regulations;
  } catch (error) {
    logger.error({ jurisdictionCode, error }, 'Normalization failed');
    return [];
  }
}
