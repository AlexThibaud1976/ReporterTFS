const axios = require('axios')
const https = require('https')
const authService = require('./AuthService')

// La version API est récupérée dynamiquement depuis la connexion active
const getApiVersion = () => authService.getApiVersion()

// Agent HTTPS pour certificats auto-signés (on-premise)
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

/**
 * AdoService — Client API Azure DevOps Server
 * Gère tous les appels REST vers ADO
 */
class AdoService {
  /**
   * Effectue un GET vers l'API ADO
   * @private
   */
  async _get(path, params = {}) {
    const baseUrl = authService.getBaseUrl()
    const headers = authService.buildAuthHeaders()

    try {
      const response = await axios.get(`${baseUrl}/${path}`, {
        params: { 'api-version': getApiVersion(), ...params },
        headers,
        httpsAgent,
        timeout: 30000,
      })
      return response.data
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
        `Erreur API ADO [${error.response?.status}]: ${error.message}`
      )
    }
  }

  // ─── PROJETS ────────────────────────────────────────────────────────────

  /**
   * Liste tous les projets de la collection
   * @returns {Array} Liste des projets
   */
  async getProjects() {
    const data = await this._get('_apis/projects', { $top: 200 })
    return data.value.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      state: p.state,
      url: p.url,
    }))
  }

  // ─── PLANS DE TEST ──────────────────────────────────────────────────────

  /**
   * Liste les plans de test d'un projet
   * @param {string} project - Nom ou ID du projet
   */
  async getTestPlans(project) {
    const data = await this._get(`${project}/_apis/test/plans`)
    return data.value.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      state: p.state,
      iteration: p.iteration,
      startDate: p.startDate,
      endDate: p.endDate,
      owner: p.owner?.displayName,
      rootSuiteId: p.rootSuite?.id,
    }))
  }

  // ─── SUITES DE TEST ─────────────────────────────────────────────────────

  /**
   * Liste les suites d'un plan de test
   * @param {string} project
   * @param {number} planId
   */
  async getTestSuites(project, planId) {
    const data = await this._get(`${project}/_apis/test/plans/${planId}/suites`)
    return data.value.map((s) => ({
      id: s.id,
      name: s.name,
      suiteType: s.suiteType,
      testCaseCount: s.testCaseCount,
      parentSuiteId: s.parent?.id,
      queryString: s.queryString,
    }))
  }

  // ─── CAS DE TEST ────────────────────────────────────────────────────────

  /**
   * Liste les cas de test d'une suite
   * @param {string} project
   * @param {number} planId
   * @param {number} suiteId
   */
  async getTestCases(project, planId, suiteId) {
    const data = await this._get(
      `${project}/_apis/test/plans/${planId}/suites/${suiteId}/testcases`
    )
    return (data.value || []).map((tc) => ({
      id: tc.testCase?.id,
      name: tc.testCase?.name,
      order: tc.pointAssignments?.[0]?.order,
      configuration: tc.pointAssignments?.[0]?.configuration?.name,
      tester: tc.pointAssignments?.[0]?.tester?.displayName,
    }))
  }

  // ─── EXÉCUTIONS (TEST RUNS) ──────────────────────────────────────────────

  /**
   * Liste les runs d'un plan de test
   * @param {string} project
   * @param {number} planId
   */
  async getTestRuns(project, planId) {
    const data = await this._get(`${project}/_apis/test/runs`, {
      planId,
      includeRunDetails: true,
      $top: 100,
    })
    return (data.value || []).map((r) => ({
      id: r.id,
      name: r.name,
      state: r.state,
      totalTests: r.totalTests,
      passedTests: r.passedTests,
      failedTests: r.failedTests,
      notApplicableTests: r.notApplicableTests,
      incompleteTests: r.incompleteTests,
      startedDate: r.startedDate,
      completedDate: r.completedDate,
      buildNumber: r.build?.number,
    }))
  }

  // ─── RÉSULTATS ──────────────────────────────────────────────────────────

  /**
   * Liste les résultats d'un run
   * @param {string} project
   * @param {number} runId
   */
  async getTestResults(project, runId) {
    // Première passe : récupère tous les résultats sans détails (pagination fiable)
    const PAGE_SIZE = 100
    let allResults = []
    let skip = 0
    while (true) {
      const data = await this._get(`${project}/_apis/test/runs/${runId}/results`, {
        $top: PAGE_SIZE,
        $skip: skip,
      })
      const page = data.value || []
      allResults = allResults.concat(page)
      if (page.length < PAGE_SIZE) break
      skip += PAGE_SIZE
      if (skip >= 5000) break
    }

    // Deuxième passe : bugs associés — requête UNIQUE sans $skip (compatible toutes versions ADO Server).
    // $skip + detailsToInclude=WorkItems est instable sur certaines versions TFS/ADO on-premise.
    const bugsByResultId = new Map()
    try {
      const bugData = await this._get(`${project}/_apis/test/runs/${runId}/results`, {
        $top: 1000,
        detailsToInclude: 'WorkItems',
      })
      for (const br of (bugData.value || [])) {
        if (br.associatedBugs?.length > 0) {
          bugsByResultId.set(br.id, br.associatedBugs)
        }
      }
    } catch (_) {
      // Si l'API ne supporte pas detailsToInclude, on continue sans bugs
    }

    return allResults.map((r) => ({
      id: r.id,
      testCaseId: r.testCase?.id,
      testCaseName: r.testCase?.name,
      outcome: r.outcome,
      state: r.state,
      errorMessage: r.errorMessage,
      durationInMs: r.durationInMs,
      startedDate: r.startedDate,
      completedDate: r.completedDate,
      computerName: r.computerName,
      tester: r.runBy?.displayName,
      associatedBugs: (bugsByResultId.get(r.id) || r.associatedBugs || []).map((b) => ({ id: b.id, url: b.url })),
      comment: r.comment,
    }))
  }

  // ─── WORK ITEMS (BUGS / EXIGENCES) ──────────────────────────────────────

  /**
   * Récupère un work item (bug, exigence, user story)
   * @param {string} project
   * @param {number} id
   */
  async getWorkItem(project, id) {
    const data = await this._get(`${project}/_apis/wit/workitems/${id}`)
    return {
      id: data.id,
      title: data.fields?.['System.Title'],
      type: data.fields?.['System.WorkItemType'],
      state: data.fields?.['System.State'],
      assignedTo: data.fields?.['System.AssignedTo']?.displayName,
      severity: data.fields?.['Microsoft.VSTS.Common.Severity'],
      priority: data.fields?.['Microsoft.VSTS.Common.Priority'],
      url: data._links?.html?.href,
    }
  }

  // ─── BATCH WORK ITEMS ───────────────────────────────────────────────────

  /**
   * Récupère des work items en batch (max 200 IDs par requête)
   * @param {number[]} ids
   * @param {'none'|'relations'} expand
   * @returns {Promise<object[]>}
   */
  async _getWorkItemsBatch(ids, expand = 'none') {
    if (!ids || ids.length === 0) return []
    const results = []
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200)
      try {
        const data = await this._get('_apis/wit/workitems', {
          ids: chunk.join(','),
          '$expand': expand === 'relations' ? 'Relations' : expand,
          errorPolicy: 'omit',
        })
        results.push(...(data.value || []))
      } catch (_) { /* Continuer si un batch échoue */ }
    }
    return results.filter(Boolean)
  }

  // ─── TRAÇABILITÉ ────────────────────────────────────────────────────────

  /**
   * Construit la traçabilité : pour chaque test case, trouve les exigences
   * (User Story / Requirement) et remonte la hiérarchie vers Feature et Epic.
   * Enrichit aussi les résultats avec les détails des bugs.
   *
   * @param {object[]} suitesWithCases - Suites avec leurs test cases
   * @param {object[]} results         - Résultats d'exécution du dernier run
   * @returns {Promise<{traceability, bugDetails, enrichedResults}>}
   */
  async _buildTraceability(suitesWithCases, results) {
    const baseUrl = authService.getBaseUrl()

    // ── 1. IDs uniques des test cases ──────────────────────────────────
    const testCaseIds = [
      ...new Set(
        suitesWithCases.flatMap((s) =>
          (s.testCases || []).map((tc) => Number(tc.id)).filter((id) => !isNaN(id) && id > 0)
        )
      ),
    ]
    if (testCaseIds.length === 0) return { traceability: [], bugDetails: [], enrichedResults: results }

    // ── 2. Fetch TCs avec leurs relations ──────────────────────────────
    const tcWorkItems = await this._getWorkItemsBatch(testCaseIds, 'Relations')

    // ── 3. Collecter les IDs d'exigences liées ─────────────────────────
    //    Depuis un TC : la relation vers son exigence est TestedBy-REVERSE
    //    ("Tested By" Forward = Exigence → TC ; Reverse = TC → Exigence)
    const TC_TO_REQ_RELS = [
      'Microsoft.VSTS.Common.TestedBy-Reverse',  // Relation standard ADO TFS
      'Microsoft.VSTS.Common.TestedBy-Forward',  // Fallback si configuré différemment
    ]
    const reqIds = [...new Set(
      tcWorkItems.flatMap((wi) =>
        (wi.relations || [])
          .filter((r) => TC_TO_REQ_RELS.includes(r.rel))
          .map((r) => parseInt(r.url.split('/').pop()))
          .filter((id) => !isNaN(id) && id > 0)
      )
    )]

    // ── 4. Fetch exigences avec relations (pour remonter vers Feature) ─
    const reqWorkItems = reqIds.length > 0 ? await this._getWorkItemsBatch(reqIds, 'Relations') : []

    // ── 5. Collecter les IDs de Features ──────────────────────────────
    const featureIds = [...new Set(
      reqWorkItems.flatMap((wi) =>
        (wi.relations || [])
          .filter((r) => r.rel === 'System.LinkTypes.Hierarchy-Reverse')
          .map((r) => parseInt(r.url.split('/').pop()))
          .filter((id) => !isNaN(id) && id > 0)
      )
    )]

    // ── 6. Fetch Features avec relations (pour remonter vers Epic) ─────
    const featureWorkItems = featureIds.length > 0 ? await this._getWorkItemsBatch(featureIds, 'Relations') : []

    // ── 7. Collecter et fetch les Epics ────────────────────────────────
    const epicIds = [...new Set(
      featureWorkItems.flatMap((wi) =>
        (wi.relations || [])
          .filter((r) => r.rel === 'System.LinkTypes.Hierarchy-Reverse')
          .map((r) => parseInt(r.url.split('/').pop()))
          .filter((id) => !isNaN(id) && id > 0)
      )
    )]
    const epicWorkItems = epicIds.length > 0 ? await this._getWorkItemsBatch(epicIds, 'none') : []

    // ── 8. Lookup maps ─────────────────────────────────────────────────
    const _wiInfo = (wi) => ({
      id: wi.id,
      title: wi.fields?.['System.Title'] || `#${wi.id}`,
      type: wi.fields?.['System.WorkItemType'] || 'WorkItem',
      state: wi.fields?.['System.State'] || '',
      // Préférer le lien ADO natif, sinon construire l'URL manuellement
      url: wi._links?.html?.href
        || `${baseUrl}/${wi.fields?.['System.TeamProject'] || ''}/_workitems/edit/${wi.id}`,
    })

    const reqMap     = new Map(reqWorkItems.map((wi) => [wi.id, wi]))
    const featureMap = new Map(featureWorkItems.map((wi) => [wi.id, wi]))
    const epicMap    = new Map(epicWorkItems.map((wi) => [wi.id, wi]))

    // ── 9. Construire la traçabilité par test case ─────────────────────
    const traceability = tcWorkItems.map((tcWi) => {
      // IMPORTANT : utiliser TC_TO_REQ_RELS qui inclut Reverse (TC→Req) et Forward (fallback)
      const linkedReqRels = (tcWi.relations || []).filter(
        (r) => TC_TO_REQ_RELS.includes(r.rel)
      )
      const requirements = linkedReqRels
        .map((rel) => {
          const reqId = parseInt(rel.url.split('/').pop())
          const reqWi = reqMap.get(reqId)
          if (!reqWi) return null
          const reqInfo = _wiInfo(reqWi)

          // Remonter vers Feature
          const featureRel = (reqWi.relations || []).find(
            (r) => r.rel === 'System.LinkTypes.Hierarchy-Reverse'
          )
          const featureId = featureRel ? parseInt(featureRel.url.split('/').pop()) : null
          const featureWi = featureId ? featureMap.get(featureId) : null
          if (featureWi) {
            const featureInfo = _wiInfo(featureWi)
            // Remonter vers Epic
            const epicRel = (featureWi.relations || []).find(
              (r) => r.rel === 'System.LinkTypes.Hierarchy-Reverse'
            )
            const epicId = epicRel ? parseInt(epicRel.url.split('/').pop()) : null
            featureInfo.parent = epicId && epicMap.get(epicId) ? _wiInfo(epicMap.get(epicId)) : null
            reqInfo.parent = featureInfo
          }
          return reqInfo
        })
        .filter(Boolean)

      return {
        testCaseId: tcWi.id,
        testCaseName: tcWi.fields?.['System.Title'] || `TC #${tcWi.id}`,
        requirements,
      }
    })

    // ── 10. Bugs liés aux TCs via leurs relations WI (Related, Affects…) ─
    // Les bugs créés manuellement depuis le TC apparaissent en "Related" sur le
    // work item TC, PAS dans associatedBugs des résultats de run.
    const TC_TO_BUG_RELS = [
      'System.LinkTypes.Related',                    // Lien "Related" symétrique
      'Microsoft.VSTS.Common.Affects-Forward',       // "Affects"
      'Microsoft.VSTS.Common.Affects-Reverse',
    ]
    const relatedWiIds = [...new Set(
      tcWorkItems.flatMap((wi) =>
        (wi.relations || [])
          .filter((r) => TC_TO_BUG_RELS.includes(r.rel))
          .map((r) => parseInt(r.url.split('/').pop()))
          .filter((id) => !isNaN(id) && id > 0)
      )
    )]
    // Fetch pour vérifier le type — on garde uniquement les Bugs
    const relatedWorkItems = relatedWiIds.length > 0
      ? await this._getWorkItemsBatch(relatedWiIds, 'none')
      : []
    const relatedBugWIs = relatedWorkItems.filter(
      (wi) => wi.fields?.['System.WorkItemType'] === 'Bug'
    )

    // ── 11. Bugs depuis les résultats de run ───────────────────────────
    const runBugIds = [...new Set(
      results.flatMap((r) =>
        (r.associatedBugs || []).map((b) => Number(b.id)).filter((id) => !isNaN(id) && id > 0)
      )
    )]
    const runBugWorkItems = runBugIds.length > 0
      ? await this._getWorkItemsBatch(runBugIds, 'none')
      : []

    // ── 12. Fusionner les deux sources de bugs (run + relations WI) ────
    const allBugWIMap = new Map()
    for (const wi of [...runBugWorkItems, ...relatedBugWIs]) {
      allBugWIMap.set(wi.id, wi)  // la dedup se fait naturellement
    }

    // Carte inverse bug→testCase depuis les résultats de run
    const bugToTestCase = new Map()
    for (const r of results) {
      for (const b of (r.associatedBugs || [])) {
        const bid = Number(b.id)
        if (!bugToTestCase.has(bid)) {
          bugToTestCase.set(bid, { id: r.testCaseId, name: r.testCaseName })
        }
      }
    }
    // Compléter avec les bugs trouvés via les relations WI du TC
    for (const tcWi of tcWorkItems) {
      const linkedBugIds = (tcWi.relations || [])
        .filter((r) => TC_TO_BUG_RELS.includes(r.rel))
        .map((r) => parseInt(r.url.split('/').pop()))
        .filter((id) => !isNaN(id) && id > 0)
      for (const bugId of linkedBugIds) {
        if (allBugWIMap.has(bugId) && !bugToTestCase.has(bugId)) {
          bugToTestCase.set(bugId, {
            id: tcWi.id,
            name: tcWi.fields?.['System.Title'] || `TC #${tcWi.id}`,
          })
        }
      }
    }

    const bugDetailMap = new Map()
    const bugDetails = [...allBugWIMap.values()].map((wi) => {
      const detail = {
        id: wi.id,
        title: wi.fields?.['System.Title'] || `Bug #${wi.id}`,
        state: wi.fields?.['System.State'] || '',
        severity: wi.fields?.['Microsoft.VSTS.Common.Severity'] || '',
        priority: wi.fields?.['Microsoft.VSTS.Common.Priority'] || '',
        assignedTo: wi.fields?.['System.AssignedTo']?.displayName || '',
        url: wi._links?.html?.href
          || `${baseUrl}/${wi.fields?.['System.TeamProject'] || ''}/_workitems/edit/${wi.id}`,
        testCase: bugToTestCase.get(wi.id) || null,
      }
      bugDetailMap.set(wi.id, detail)
      return detail
    })

    // ── 13. Enrichir les résultats avec détails bugs + URLs ────────────
    const enrichedResults = results.map((r) => ({
      ...r,
      associatedBugs: (r.associatedBugs || []).map((b) => ({
        ...b,
        ...(bugDetailMap.get(Number(b.id)) || {}),
      })),
    }))

    return { traceability, bugDetails, enrichedResults }
  }

  // ─── EXTRACTION COMPLÈTE ────────────────────────────────────────────────

  // ─── PIÈCES JOINTES ────────────────────────────────────────────────────

  /**
   * Liste les pièces jointes d'un résultat de test
   */
  async getTestAttachments(project, runId, resultId) {
    try {
      const data = await this._get(
        `${project}/_apis/test/runs/${runId}/results/${resultId}/attachments`
      )
      return (data.value || []).map((a) => ({
        id: a.id,
        fileName: a.fileName,
        size: a.size,
        url: a.url,
      }))
    } catch (_) {
      return []
    }
  }

  /**
   * Télécharge une pièce jointe et la renvoie en base64
   * @private
   */
  async _downloadAttachment(url) {
    const headers = authService.buildAuthHeaders()
    const response = await axios.get(url, {
      headers,
      httpsAgent,
      responseType: 'arraybuffer',
      timeout: 30000,
    })
    return Buffer.from(response.data).toString('base64')
  }

  /**
   * Récupère toutes les pièces jointes du dernier run, avec base64 pour les images
   * @private
   */
  async _buildAttachments(project, latestRun, enrichedResults) {
    if (!latestRun) return []
    const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'])
    const attachments = []
    for (const result of enrichedResults) {
      if (!result.id) continue
      const files = await this.getTestAttachments(project, latestRun.id, result.id)
      for (const file of files) {
        const ext = (file.fileName || '').toLowerCase().split('.').pop()
        let base64 = null
        if (IMAGE_EXTS.has(ext) && file.url) {
          try { base64 = await this._downloadAttachment(file.url) } catch (_) {}
        }
        attachments.push({
          id: file.id,
          fileName: file.fileName,
          size: file.size,
          base64,
          testCaseName: result.testCaseName,
          testCaseId: result.testCaseId,
          runName: latestRun.name,
        })
      }
    }
    return attachments
  }

  // ─── EXTRACTION COMPLÈTE ────────────────────────────────────────────────

  /**
   * Extrait toutes les données d'un plan de test (opération lourde)
   * Retourne un objet structuré avec tout ce qu'il faut pour générer le rapport
   * @param {string} project
   * @param {number} planId
   * @param {object} options - { includeAttachments: boolean }
   */
  async getFullPlanData(project, planId, options = {}) {
    const plans = await this.getTestPlans(project)
    const plan = plans.find((p) => p.id === parseInt(planId))
    if (!plan) throw new Error('Plan de test ' + planId + ' introuvable')

    const suites = await this.getTestSuites(project, planId)
    const suitesWithCases = await Promise.all(
      suites.map(async (suite) => {
        const testCases = await this.getTestCases(project, planId, suite.id)
        return { ...suite, testCases }
      })
    )

    const runs = await this.getTestRuns(project, planId)
    const latestRun = runs[0]

    let results = []
    if (latestRun) {
      results = await this.getTestResults(project, latestRun.id)
    }

    const history = await this._buildHistory(project, runs.slice(0, 10))
    const suiteMetrics = this._computeSuiteMetrics(results, suitesWithCases)
    const metrics = this._computeMetrics(results, suites, suitesWithCases)

    // Traçabilité : on l'essaie séparément pour ne pas bloquer le rapport en
    // cas de permissions insuffisantes sur l'API work items.
    let traceability = []
    let bugDetails = []
    let enrichedResults = results
    let traceabilityError = null
    try {
      const traceData = await this._buildTraceability(suitesWithCases, results)
      traceability = traceData.traceability
      bugDetails   = traceData.bugDetails
      enrichedResults = traceData.enrichedResults
    } catch (err) {
      traceabilityError = err.message
      console.warn('[AdoService] Traçabilité ignorée :', err.message)
    }

    // Mettre à jour bugsCount avec le total réel (inclut les bugs liés via relation WI)
    if (bugDetails.length > metrics.bugsCount) {
      metrics.bugsCount = bugDetails.length
      metrics.bugIds = bugDetails.map((b) => b.id)
    }

    // Pièces jointes (optionnel, peut être long)
    let attachments = []
    if (options.includeAttachments) {
      try {
        attachments = await this._buildAttachments(project, latestRun, enrichedResults)
      } catch (err) {
        console.warn('[AdoService] Pièces jointes ignorées :', err.message)
      }
    }

    return {
      plan,
      suites: suitesWithCases,
      suiteMetrics,
      runs,
      latestRun,
      results: enrichedResults,
      history,
      metrics,
      traceability,
      bugDetails,
      attachments,
      adoBaseUrl: authService.getBaseUrl(),
      project,
      traceabilityError,
      extractedAt: new Date().toISOString(),
    }
  }

  async _buildHistory(project, runs) {
    const history = []
    for (const run of runs) {
      try {
        const results = await this.getTestResults(project, run.id)
        const total = results.length
        const passed = results.filter((r) => r.outcome === 'Passed').length
        history.push({
          runId: run.id,
          runName: run.name,
          date: run.completedDate || run.startedDate,
          total,
          passed,
          failed: results.filter((r) => r.outcome === 'Failed').length,
          passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
        })
      } catch (_) {}
    }
    return history.reverse()
  }

  _computeSuiteMetrics(results, suites) {
    return suites.map((suite) => {
      const caseIds = new Set((suite.testCases || []).map((tc) => String(tc.id)))
      const sr = results.filter((r) => caseIds.has(String(r.testCaseId)))
      const total = sr.length
      const passed = sr.filter((r) => r.outcome === 'Passed').length
      return {
        suiteId: suite.id,
        suiteName: suite.name,
        total,
        passed,
        failed: sr.filter((r) => r.outcome === 'Failed').length,
        blocked: sr.filter((r) => r.outcome === 'Blocked').length,
        notExecuted: sr.filter((r) => ['NotExecuted','NotApplicable'].includes(r.outcome)).length,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      }
    })
  }

  /**
   * Calcule les métriques de qualité
   * @private
   */
  _computeMetrics(results, suites, suitesWithCases) {
    const total = results.length
    const passed = results.filter((r) => r.outcome === 'Passed').length
    const failed = results.filter((r) => r.outcome === 'Failed').length
    const blocked = results.filter((r) => r.outcome === 'Blocked').length
    const notExecuted = results.filter((r) =>
      ['NotExecuted', 'NotApplicable', 'Inconclusive'].includes(r.outcome)
    ).length

    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
    const alertTriggered = passRate < 80

    const bugIds = results.flatMap((r) => r.associatedBugs?.map((b) => b.id) || [])
    const uniqueBugs = [...new Set(bugIds)]

    return {
      total,
      passed,
      failed,
      blocked,
      notExecuted,
      passRate,
      alertTriggered,
      suitesCount: suites.length,
      bugsCount: uniqueBugs.length,
      bugIds: uniqueBugs,
    }
  }
}

module.exports = new AdoService()
