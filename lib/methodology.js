const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'methodology.json');

function loadMethodology() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function getGlobalAnswers(session) {
  const prep = session.stages?.prep?.data || {};
  return {
    hasDiskImage: prep.hasDiskImage || 'да',
    hasRamDump: prep.hasRamDump || 'нет',
    ...prep
  };
}

function matchesCondition(condition, answers) {
  if (!condition) return false;
  return Object.entries(condition).every(([key, value]) => answers[key] === value);
}

function shouldSkipStage(stage, answers) {
  if (!stage.skipIf) return false;
  return matchesCondition(stage.skipIf, answers);
}

function fieldVisible(field, answers) {
  if (!field.showIf) return true;
  return matchesCondition(field.showIf, answers);
}

function getActiveStages(session) {
  const methodology = loadMethodology();
  const answers = getGlobalAnswers(session);
  return methodology.stages
    .filter((s) => !shouldSkipStage(s, answers))
    .sort((a, b) => a.order - b.order);
}

function getStageById(stageId) {
  const methodology = loadMethodology();
  return methodology.stages.find((s) => s.id === stageId);
}

function getNextStageId(currentId, session) {
  const active = getActiveStages(session);
  const idx = active.findIndex((s) => s.id === currentId);
  if (idx < 0 || idx >= active.length - 1) return null;
  return active[idx + 1].id;
}

function getPrevStageId(currentId, session) {
  const active = getActiveStages(session);
  const idx = active.findIndex((s) => s.id === currentId);
  if (idx <= 0) return null;
  return active[idx - 1].id;
}

function getProgress(session) {
  const active = getActiveStages(session);
  const completed = active.filter((s) => session.stages?.[s.id]?.completed).length;
  return {
    total: active.length,
    completed,
    percent: active.length ? Math.round((completed / active.length) * 100) : 0,
    stages: active.map((s) => ({
      id: s.id,
      title: s.title,
      order: s.order,
      completed: !!session.stages?.[s.id]?.completed,
      skipped: false
    }))
  };
}

function createEmptySession() {
  return {
    id: null,
    createdAt: new Date().toISOString(),
    stages: {},
    meta: {}
  };
}

module.exports = {
  loadMethodology,
  getGlobalAnswers,
  shouldSkipStage,
  fieldVisible,
  getActiveStages,
  getStageById,
  getNextStageId,
  getPrevStageId,
  getProgress,
  createEmptySession
};
