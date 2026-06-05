const { loadMethodology, getActiveStages, getGlobalAnswers } = require('./methodology');

function formatValue(value) {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
}

function buildReport(session) {
  const methodology = loadMethodology();
  const activeStages = getActiveStages(session);
  const global = getGlobalAnswers(session);
  const now = new Date().toLocaleString('ru-RU');

  const sections = activeStages.map((stage) => {
    const data = session.stages?.[stage.id]?.data || {};
    const fields = (stage.fields || [])
      .filter((f) => {
        if (!f.showIf) return true;
        return Object.entries(f.showIf).every(([k, v]) => global[k] === v);
      })
      .map((f) => ({
        label: f.label,
        value: formatValue(data[f.id])
      }))
      .filter((row) => row.value !== '—');

    return {
      order: stage.order,
      title: stage.title,
      goal: stage.goal,
      expectedResult: stage.expectedResult,
      completedAt: session.stages?.[stage.id]?.completedAt,
      fields,
      guide: stage.guide,
      qualityCheckpoints: stage.qualityCheckpoints,
      artifactGroups: stage.artifactGroups
    };
  });

  const prep = session.stages?.prep?.data || {};

  return {
    generatedAt: now,
    title: methodology.title,
    source: methodology.source,
    caseNumber: prep.caseNumber || '—',
    expertName: prep.expertName || '—',
    expertOrg: prep.expertOrg || '—',
    receiptDate: prep.receiptDate || '—',
    expertQuestions: methodology.expertQuestions,
    documentAnswers: {
      q1: session.stages?.document?.data?.answerQ1,
      q2: session.stages?.document?.data?.answerQ2,
      q3: session.stages?.document?.data?.answerQ3,
      q4: session.stages?.document?.data?.answerQ4,
      q5: session.stages?.document?.data?.answerQ5,
      final: session.stages?.document?.data?.finalConclusion,
      tools: session.stages?.document?.data?.toolsUsed,
      limitations: session.stages?.document?.data?.methodologyLimitations
    },
    sections,
    skippedStages: methodology.stages
      .filter((s) => !activeStages.find((a) => a.id === s.id))
      .map((s) => ({ title: s.title, reason: describeSkipReason(s.id, global) }))
  };
}

function describeSkipReason(stageId, global) {
  if (stageId === 'verify' || stageId === 'disk') {
    return 'Не представлен образ диска';
  }
  if (stageId === 'ram') {
    return 'Не представлен дамп оперативной памяти';
  }
  return 'Условия методики не выполнены';
}

module.exports = { buildReport, formatValue };
