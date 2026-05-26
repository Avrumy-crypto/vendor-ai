import Anthropic from '@anthropic-ai/sdk';
import { KnowledgeEntry, SourceRef, User } from '../types';

const client = new Anthropic();

function formatEntry(e: KnowledgeEntry): string {
  const draftLabel = e.status === 'draft' ? ' [DRAFT]' : '';
  return `--- [ID:${e.id}] ${e.title}${draftLabel} ---\n${e.content}`;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function truncateEntries(entries: KnowledgeEntry[], budgetTokens: number): KnowledgeEntry[] {
  const result: KnowledgeEntry[] = [];
  let used = 0;
  for (const e of entries) {
    const cost = estimateTokens(formatEntry(e));
    if (used + cost > budgetTokens) break;
    result.push(e);
    used += cost;
  }
  return result;
}

function buildSystemPrompt(
  user: User,
  departmentName: string,
  companyEntries: KnowledgeEntry[],
  deptEntries: KnowledgeEntry[],
  personalEntries: KnowledgeEntry[],
  ragEntries: KnowledgeEntry[],
  vendorData: string
): string {
  const companyBlock = truncateEntries(companyEntries, 2000)
    .map(formatEntry).join('\n\n') || '(No company knowledge entries yet.)';

  const deptBlock = truncateEntries(deptEntries, 3000)
    .map(formatEntry).join('\n\n') || '(No department knowledge entries yet.)';

  const personalBlock = truncateEntries(personalEntries, 500)
    .map(formatEntry).join('\n\n') || '(No personal notes.)';

  // RAG: exclude IDs already in company/dept/personal to avoid duplication
  const existingIds = new Set([
    ...companyEntries.map(e => e.id),
    ...deptEntries.map(e => e.id),
    ...personalEntries.map(e => e.id)
  ]);
  const ragFiltered = truncateEntries(ragEntries.filter(e => !existingIds.has(e.id)), 2000);
  const ragBlock = ragFiltered.map(formatEntry).join('\n\n');

  const vendorBlock = vendorData
    ? `\n\n[VENDOR DATA — from company vendor database]\n${vendorData}`
    : '';

  return `You are the AI assistant for Five Star Corrugated, supporting the ${departmentName} department.

Rules:
- Only answer based on the knowledge provided in this prompt. Do not invent specifications, pricing, policies, or vendor details.
- Cite sources inline as [SOURCE:id] immediately after the relevant sentence. Example: C-flute is 11/64" thick [SOURCE:12].
- If you cannot answer from the provided knowledge, say so clearly and suggest the employee ask their manager or consult the relevant department.
- Never reveal full knowledge entries verbatim — summarize and explain clearly.
- For any action that would affect external systems (sending emails, updating Odoo/CRM, submitting quotes, making payments), you MUST output an APPROVAL REQUIRED block before proceeding, listing exactly what would happen.

[COMPANY KNOWLEDGE — applies to all employees]
${companyBlock}

[DEPARTMENT KNOWLEDGE — ${departmentName}]
${deptBlock}

[PERSONAL CONTEXT — private notes for this employee]
${personalBlock}
${ragBlock ? `\n[ADDITIONAL RELEVANT KNOWLEDGE — retrieved for this query]\n${ragBlock}` : ''}${vendorBlock}

[EMPLOYEE]
Name: ${user.display_name} | Role: ${user.role} | Department: ${departmentName}
Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
}

function extractSources(content: string, entries: KnowledgeEntry[]): { cleaned: string; sources: SourceRef[] } {
  const entryMap = new Map(entries.map(e => [e.id, e]));
  const foundIds = new Set<number>();
  const regex = /\[SOURCE:(\d+)\]/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const id = parseInt(match[1], 10);
    if (entryMap.has(id)) foundIds.add(id);
  }

  // Replace [SOURCE:N] with inline badge tokens the frontend can parse
  const cleaned = content.replace(/\[SOURCE:(\d+)\]/g, (_, idStr) => {
    const id = parseInt(idStr, 10);
    const entry = entryMap.get(id);
    if (!entry) return '';
    return `[[src:${id}:${entry.title}:${entry.layer}]]`;
  });

  const sources: SourceRef[] = Array.from(foundIds).map(id => {
    const e = entryMap.get(id)!;
    return { id: e.id, title: e.title, layer: e.layer };
  });

  return { cleaned, sources };
}

export async function chat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  user: User,
  departmentName: string,
  companyEntries: KnowledgeEntry[],
  deptEntries: KnowledgeEntry[],
  personalEntries: KnowledgeEntry[],
  ragEntries: KnowledgeEntry[],
  vendorData: string
): Promise<{ content: string; sources: SourceRef[]; requiresApproval: boolean }> {
  const systemPrompt = buildSystemPrompt(
    user, departmentName,
    companyEntries, deptEntries, personalEntries, ragEntries, vendorData
  );

  const allEntries = [...companyEntries, ...deptEntries, ...personalEntries, ...ragEntries];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: messages.slice(-20)
  });

  const rawContent = response.content[0].type === 'text' ? response.content[0].text : '';
  const { cleaned, sources } = extractSources(rawContent, allEntries);
  const requiresApproval = rawContent.includes('APPROVAL REQUIRED');

  return { content: cleaned, sources, requiresApproval };
}
