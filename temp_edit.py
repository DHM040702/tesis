from pathlib import Path
path = Path('frontend/src/pages/DashboardPage.tsx')
text = path.read_text()
marker = '      <section className="surface">\r\n        <header className="section-header">\r\n          <div>\r\n            <h2 className="section-header__title">Detalle de estudiantes</h2>'
start = text.find(marker)
if start == -1:
    raise SystemExit('marker not found')
end = text.find('      </section>', start)
if end == -1:
    raise SystemExit('end not found')
end = text.find('\n', end)
if end == -1:
    end = len(text)
new_section = '''      <section className="surface">
        <header className="section-header">
          <div>
            <h2 className="section-header__title">Detalle de estudiantes</h2>
            <p className="section-header__subtitle">
              Tabla ordenada por puntaje ascendente (menor puntaje = mayor riesgo).
            </p>
          </div>
          <div className="section-header__meta">
            <span>{totalItems} registros · Actualizado {dayjs().format("DD/MM/YYYY HH:mm")}</span>
          </div>
        </header>
        <div className="table-pagination table-pagination--inline">
          <div className="table-pagination__actions">
            <label className="field table-pagination__page-size">
              <span className="field__label">Registros por página</span>
              <select className="field__control" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="table-pagination__buttons">
              <button type="button" className="button button--ghost" onClick=lambda prev: None>
                placeholder
              </button>
            </div>
          </div>
        </div>
      </section>
'''
