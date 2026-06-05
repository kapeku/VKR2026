const path = require('path');
const express = require('express');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const {
  loadMethodology,
  getActiveStages,
  getGlobalAnswers,
  fieldVisible,
  getStageById,
  getNextStageId,
  getPrevStageId,
  getProgress,
  createEmptySession
} = require('./lib/methodology');
const { buildReport } = require('./lib/report');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'linux-cte-vkr-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  })
);

function ensureSession(req) {
  if (!req.session.investigation) {
    req.session.investigation = createEmptySession();
    req.session.investigation.id = uuidv4();
  }
  return req.session.investigation;
}

app.use((req, res, next) => {
  res.locals.methodology = loadMethodology();
  res.locals.inv = req.session.investigation;
  if (req.session.investigation) {
    res.locals.progress = getProgress(req.session.investigation);
    res.locals.activeStages = getActiveStages(req.session.investigation);
  }
  next();
});

app.get('/', (req, res) => {
  const inv = ensureSession(req);
  const progress = getProgress(inv);
  res.render('index', { inv, progress });
});

app.post('/reset', (req, res) => {
  req.session.investigation = createEmptySession();
  req.session.investigation.id = uuidv4();
  res.redirect('/');
});

app.get('/stage/:stageId', (req, res) => {
  const inv = ensureSession(req);
  const stage = getStageById(req.params.stageId);
  if (!stage) return res.status(404).render('error', { message: 'Этап не найден' });

  const active = getActiveStages(inv);
  if (!active.find((s) => s.id === stage.id)) {
    return res.status(403).render('error', {
      message: 'Этап отключён методикой (проверьте ответы на подготовительном этапе)'
    });
  }

  const answers = getGlobalAnswers(inv);
  const visibleFields = stage.fields.filter((f) => fieldVisible(f, answers));
  const saved = inv.stages[stage.id]?.data || {};

  res.render('stage', {
    stage,
    visibleFields,
    saved,
    answers,
    prevId: getPrevStageId(stage.id, inv),
    nextId: getNextStageId(stage.id, inv),
    progress: getProgress(inv)
  });
});

app.post('/stage/:stageId', (req, res) => {
  const inv = ensureSession(req);
  const stage = getStageById(req.params.stageId);
  if (!stage) return res.status(404).send('Этап не найден');

  const answers = getGlobalAnswers(inv);
  const data = {};

  for (const field of stage.fields) {
    if (!fieldVisible(field, answers)) continue;
    const raw = req.body[field.id];
    if (field.type === 'checkboxes') {
      data[field.id] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    } else {
      data[field.id] = raw ?? '';
    }
  }

  if (!inv.stages[stage.id]) inv.stages[stage.id] = {};
  inv.stages[stage.id].data = data;
  inv.stages[stage.id].completed = req.body.action === 'complete';
  if (inv.stages[stage.id].completed) {
    inv.stages[stage.id].completedAt = new Date().toISOString();
  }

  req.session.investigation = inv;

  if (req.body.action === 'complete') {
    const next = getNextStageId(stage.id, inv);
    if (next) return res.redirect(`/stage/${next}`);
    return res.redirect('/report');
  }
  if (req.body.action === 'next' && getNextStageId(stage.id, inv)) {
    return res.redirect(`/stage/${getNextStageId(stage.id, inv)}`);
  }
  res.redirect(`/stage/${stage.id}?saved=1`);
});

app.get('/report', (req, res) => {
  const inv = ensureSession(req);
  const report = buildReport(inv);
  res.render('report', { report, inv });
});

app.get('/report/print', (req, res) => {
  const inv = ensureSession(req);
  const report = buildReport(inv);
  res.render('report-print', { report, inv });
});

app.listen(PORT, () => {
  console.log(`Помощник эксперта КТЭ Linux: http://localhost:${PORT}`);
});
