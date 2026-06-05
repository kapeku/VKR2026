(function () {
  const form = document.getElementById('stageForm');
  if (!form) return;

  function getFormValues() {
    const values = {};
    form.querySelectorAll('select, input[type="text"], input[type="date"], textarea').forEach(function (el) {
      if (el.name && !el.name.endsWith('[]')) values[el.name] = el.value;
    });
    return values;
  }

  function applyConditionalVisibility() {
    const values = getFormValues();
    form.querySelectorAll('[data-show-if]').forEach(function (group) {
      try {
        const rule = JSON.parse(group.getAttribute('data-show-if'));
        const visible = Object.entries(rule).every(function (entry) {
          return values[entry[0]] === entry[1];
        });
        group.classList.toggle('field-hidden', !visible);
      } catch (e) {
        /* ignore parse errors */
      }
    });
  }

  form.querySelectorAll('select').forEach(function (sel) {
    sel.addEventListener('change', applyConditionalVisibility);
  });

  applyConditionalVisibility();
})();
