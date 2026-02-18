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
    const PAGE_SIZE = 100   // Conservatif : évite les limites ADO avec ou sans détails
    let allResults = []
    let skip = 0

    while (true) {
      const data = await this._get(`${project}/_apis/test/runs/${runId}/results`, {
        $top: PAGE_SIZE,
        $skip: skip,
        // Pas de detailsToInclude ici : ce paramètre déclenche une limite stricte côté API
      })
      const page = data.value || []
      allResults = allResults.concat(page)
      if (page.length < PAGE_SIZE) break
      skip += PAGE_SIZE
      if (skip >= 5000) break  // Sécurité anti-boucle infinie
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
      associatedBugs: (r.associatedBugs || []).map((b) => ({ id: b.id, url: b.url })),
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

  // ─── EXTRACTION COMPLÈTE ────────────────────────────────────────────────

  /**
   * Extrait toutes les données d'un plan de test (opération lourde)
   * Retourne un objet structuré avec tout ce qu'il faut pour générer le rapport
   * @param {string} project
   * @param {number} planId
   */
  async getFullPlanData(project, planId) {
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

    return {
      plan,
      suites: suitesWithCases,
      suiteMetrics,
      runs,
      latestRun,
      results,
      history,
      metrics,
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
