 PRD: FreeSewing MCP Authoring Server

  Obiettivo
  Creare un server MCP che permetta a un agent AI di lavorare con FreeSewing in modo controllato: ispezionare design esistenti, generarli con misure/
  opzioni, renderizzare SVG, estrarre dati strutturati e validare il cartamodello.

  Il primo MVP non crea nuovi design da zero. Serve a costruire il banco tecnico affidabile su cui poi aggiungere authoring, fork, componenti e generazione
  controllata.

  Fonti tecniche di riferimento: FreeSewing docs (https://v4.freesewing.org/docs/about/), FreeSewing Core API (https://freesewing.dev/reference/api/),
  FreeSewing GitHub (https://github.com/freesewing).

  ———

  Principio Chiave
  FreeSewing distingue tra:

  Design = codice parametrico del modello
  Pattern = risultato generato dal design con misure/opzioni
  SVG/PDF = export del pattern

  Quindi il progetto deve scaricare/installare design FreeSewing come codice/pacchetti, non SVG già pronti.

  ———

  MVP v0
  Il MVP deve supportare questo flusso:

  agent
  -> MCP tool
  -> design FreeSewing installato
  -> draft con misure/opzioni
  -> SVG + renderProps
  -> validation report

  Input MVP:

  designId
  measurements
  options

  Output MVP:

  patternId
  pattern.svg
  render-props.json
  validation-report.json

  ———

  Requisito: Design FreeSewing Da Scaricare
  Per procedere, il sistema deve installare alcuni design FreeSewing ufficiali.

  Opzioni possibili:

  A. installare pacchetti npm @freesewing/*
  B. clonare/importare il monorepo FreeSewing
  C. mantenere una allowlist locale di design supportati

  Per MVP consiglio:

  @freesewing/core
  2-3 design semplici FreeSewing
  eventuali plugin SVG/render necessari
  fixture di measurements
  fixture di options

  I design non devono essere caricati dall’utente come SVG. Devono essere codice parametrico ufficiale FreeSewing.

  ———

  Scope MVP
  Tool MCP v0:

  list_designs()
  inspect_design(designId)
  get_design_options(designId)
  get_measurement_requirements(designId)
  draft_design(designId, measurements, options)
  render_svg(patternId)
  get_render_props(patternId)
  validate_pattern(patternId)
  run_size_matrix(designId, options, measurementSets)
  explain_failure(patternId)

  Con questi tool si può:

  - elencare i design installati;
  - capire opzioni e misure richieste;
  - draftare un design esistente;
  - generare SVG;
  - ottenere renderProps;
  - testare più set di misure;
  - produrre errori leggibili per l’agent.

  Non si può ancora:

  - creare nuovi design;
  - patchare codice;
  - generare capi da immagine;
  - fare fine-tuning;
  - comporre capi nuovi da componenti.

  ———

  Resources MCP

  design://{designId}/metadata
  design://{designId}/options
  design://{designId}/measurements
  pattern://{patternId}/svg
  pattern://{patternId}/render-props
  pattern://{patternId}/validation-report
  measurements://fixtures/{setId}

  ———

  Prompts MCP

  analyze_design
  draft_and_validate
  debug_failed_pattern
  compare_size_matrix
  suggest_supported_options

  ———

  Validazione MVP
  Validation report minimo:

  draftSuccess
  renderSuccess
  svgNotEmpty
  renderPropsAvailable
  partsCount
  pathsCount
  missingMeasurements
  invalidOptions
  warnings
  errors

  Validazione successiva:

  pieceAreaPositive
  closedPathsValid
  selfIntersectionCheck
  grainlinePresent
  notchesPresent
  seamPairsMatched
  cutlistValid
  sizeMatrixStable

  ———

  Architettura Proposta

  freesewing-mcp/
    src/
      mcp/
        server.ts
        tools.ts
        resources.ts
        prompts.ts

      freesewing/
        registry.ts
        installer.ts
        inspect.ts
        draft.ts
        render.ts
        storage.ts

      validation/
        basic.ts
        geometry.ts
        size-matrix.ts
        reports.ts

      schemas/
        tool-inputs.ts
        measurements.ts
        options.ts
        validation-report.ts

    fixtures/
      measurements/
      options/

    outputs/
      patterns/
      svg/
      render-props/
      reports/

    tests/

  ———

  Fasi Successive
  v1: authoring controllato

  fork_design()
  scaffold_design()
  read_design_source()
  patch_design(dryRun=true)
  run_design_tests()
  compare_design_versions()

  v2: component library

  create_bodice_block()
  apply_neckline()
  create_sleeve()
  create_skirt()
  add_pocket()
  add_closure()
  add_notches()
  add_grainline()

  v3: natural language

  descrizione utente
  -> DSL
  -> design/opzioni/componenti
  -> draft
  -> validazione

  v4: immagine

  immagine capo
  -> estrazione caratteristiche
  -> DSL
  -> pattern supportato o richiesta non supportata

  ———

  Criteri Di Successo MVP
  MVP riuscito se:

  - almeno 2-3 design FreeSewing ufficiali vengono installati/importati;
  - list_designs li vede correttamente;
  - inspect_design restituisce opzioni/misure;
  - draft_design genera pattern reali;
  - render_svg produce SVG non vuoto;
  - get_render_props produce dati strutturati;
  - run_size_matrix testa almeno 3 set di misure;
  - validate_pattern produce report leggibile dall’agent.

  ———

  Non Fare Nel MVP
  Non partire con:

  - SVG caricati come fonte primaria;
  - generazione libera di codice FreeSewing;
  - fine-tuning;
  - input immagine;
  - design complessi;
  - editing diretto di SVG;
  - promessa “qualsiasi capo -> cartamodello preciso”.

  ———

  Primo Spike Tecnico
  Implementare:

  1. installazione/import di @freesewing/core + design selezionati
  2. registry locale dei design disponibili
  3. draft di un design con measurements fixture
  4. render SVG
  5. salvataggio renderProps
  6. validation report base
  7. tool MCP list_designs, inspect_design, draft_design, validate_pattern

  Risultato atteso:

  Un agent può chiedere:
  “Elenca i design FreeSewing installati, drafta questo design con queste misure, genera SVG e dimmi se il pattern è valido.”

  Questo è il fondamento. Solo dopo ha senso aggiungere generazione/modifica di nuovi design.