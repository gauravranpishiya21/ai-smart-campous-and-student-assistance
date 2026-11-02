// Smart Campus Helpdesk Ticket Triage Engine
// Automated classification, SLA routing, sentiment analysis, and self-service remediation.

const prompts = require('../prompts');
const gemini = require('./gemini');

const DEPARTMENTS = [
  { name: 'IT Services', pattern: /wi-?fi|internet|network|login|password|portal|lms|email|software|laptop|pc|computer|printer|server|vpn/i },
  { name: 'Hostel Office', pattern: /hostel|mess|room|warden|laundry|roommate|geyser|heater|mess food|bed|curfew/i },
  { name: 'Accounts & Fees', pattern: /fee|fees|tuition|payment|refund|receipt|scholarship|challan|invoice|dues|fine/i },
  { name: 'Examination Cell', pattern: /exam|marks|result|revaluation|hall ticket|admit card|grade|cie|see|backlog/i },
  { name: 'Transport Office', pattern: /bus|transport|route|driver|vehicle|parking|shuttle/i },
  { name: 'Maintenance', pattern: /projector|fan|light|ac |air conditioner|electric|water leak|broken|plumbing|toilet|cleaning|bench/i },
  { name: 'Library', pattern: /library|book|borrow|journal|e-?book|fine.*book|catalog/i },
  { name: 'Academic Office', pattern: /timetable|faculty|class|syllabus|attendance|course|mentor|advisor|dean/i },
];

/**
 * Rule-based offline triage classifier
 */
function classifyOffline(text, categoryHint = '') {
  const combined = `${categoryHint} ${text}`.toLowerCase();

  let assignedDept = 'Student Affairs';
  let bestScore = 0;
  for (const d of DEPARTMENTS) {
    const matches = combined.match(new RegExp(d.pattern.source, 'gi'));
    if (matches && matches.length > bestScore) {
      bestScore = matches.length;
      assignedDept = d.name;
    }
  }

  // Priority detection
  const isUrgent = /urgent|emergency|immediately|asap|fire|harass|ragging|unsafe|medical|shock|electric shock|flood|danger|stuck/i.test(combined);
  const isHigh = /cannot access|blocked|exam tomorrow|fee deadline today|not working since|critical|broken geyser|leak/i.test(combined);
  const isMedium = /issue|error|fail|slow|glitch|delayed|missing/i.test(combined);

  let priority = isUrgent ? 'Urgent' : (isHigh ? 'High' : (isMedium ? 'Medium' : 'Low'));
  let sla = { Urgent: '2 hours', High: '4 hours', Medium: '24 hours', Low: '3 working days' }[priority];

  // Sentiment detection
  const isFrustrated = /unacceptable|terrible|worst|ridiculous|fed up|third time|no response|disappointed/i.test(combined);
  const isAnxious = /worried|scared|anxious|please help|urgent|stressed/i.test(combined);
  const sentiment = isFrustrated ? 'Frustrated' : (isAnxious ? 'Anxious' : (isUrgent ? 'Urgent' : 'Neutral'));

  // Suggested immediate action
  let suggestedAction = 'Your ticket has been prioritized and assigned to departmental coordinators.';
  if (assignedDept === 'IT Services') {
    suggestedAction = 'While an engineer is assigned, verify if you are connected to "EduSmart-Secure" Wi-Fi and forget & reconnect the network.';
  } else if (assignedDept === 'Accounts & Fees') {
    suggestedAction = 'Check the Fee Ledger tab for transaction reference UTR. Payment verification takes up to 24 bank hours.';
  } else if (assignedDept === 'Examination Cell') {
    suggestedAction = 'Verify your hall ticket eligibility under Academic Calendar (>= 75.0% attendance required).';
  } else if (assignedDept === 'Hostel Office') {
    suggestedAction = 'For immediate after-hours emergencies, notify the assistant warden on floor duty.';
  }

  return {
    department: assignedDept,
    priority,
    urgency_reason: isUrgent ? 'Emergency / health / safety or critical service disruption' : 'Standard issue lifecycle',
    sentiment,
    assigned_sla: sla,
    suggested_action: suggestedAction,
    tags: [assignedDept.toLowerCase().replace(/\s+/g, '-'), priority.toLowerCase()]
  };
}

/**
 * Main Ticket Triage Execution
 */
async function triageTicket(text, { category = '', userId = null } = {}) {
  const offlineFallback = () => {
    const res = classifyOffline(text, category);
    return {
      ...res,
      engine: 'offline'
    };
  };

  const systemInstruction = prompts.helpdeskTriage;
  const userPrompt = `TICKET REPORT:
Category: ${category || 'General'}
Description: "${text}"

Please triage this campus support ticket adhering strictly to the JSON schema.`;

  const geminiResult = await gemini.generateContent({
    system: systemInstruction,
    prompt: userPrompt,
    responseMimeType: 'application/json',
    maxTokens: 500,
    temperature: 0.2,
    userId,
    feature: 'helpdesk_triage',
    offlineFallback
  });

  if (geminiResult && geminiResult.department && geminiResult.priority) {
    return {
      department: geminiResult.department,
      priority: geminiResult.priority,
      urgency_reason: geminiResult.urgency_reason || 'Departmental priority assignment',
      sentiment: geminiResult.sentiment || 'Neutral',
      assigned_sla: geminiResult.assigned_sla || '24 hours',
      suggested_action: geminiResult.suggested_action || 'Ticket assigned to coordinator.',
      tags: geminiResult.tags || [geminiResult.department.toLowerCase()],
      engine: 'gemini'
    };
  }

  return offlineFallback();
}

module.exports = {
  triageTicket,
  classifyOffline
};

