"""Summarize a SonarCloud analysis for a pull request (or a branch) as Markdown.

Reads the public SonarCloud web API with the standard library only, so the same file runs on
a CI runner and locally. It never fails the job: the quality gate is enforced by the scanner
(`sonar.qualitygate.wait=true`); this report only makes the result visible.
"""

from __future__ import annotations

import argparse
import base64
import http.client
import json
import os
import sys
import time
from typing import Any
from urllib import parse, request

API = "https://sonarcloud.io/api"
DASHBOARD = "https://sonarcloud.io/dashboard"

METRIC_LABELS = {
    "new_reliability_rating": "Confiabilidade do código novo",
    "new_security_rating": "Segurança do código novo",
    "new_maintainability_rating": "Manutenibilidade do código novo",
    "new_coverage": "Cobertura do código novo",
    "new_duplicated_lines_density": "Duplicação do código novo",
    "new_security_hotspots_reviewed": "Hotspots de segurança revisados",
}
RATINGS = {"1": "A", "2": "B", "3": "C", "4": "D", "5": "E"}
PERCENT_METRICS = {
    "new_coverage",
    "new_duplicated_lines_density",
    "new_security_hotspots_reviewed",
}
STATUS_MARKS = {"OK": "✅", "ERROR": "❌"}
GATE_LABELS = {"OK": "✅ aprovado", "ERROR": "❌ reprovado", "WARN": "⚠️ com alerta"}
SEVERITIES = {"BLOCKER": "🔴", "CRITICAL": "🔴", "MAJOR": "🟠", "MINOR": "🟡", "INFO": "⚪"}
MAX_ISSUES = 10
MARKER = "<!-- sonar-report:{project} -->"
READ_FAILURES = (OSError, http.client.HTTPException, KeyError, ValueError)
ATTEMPTS = 6


def get(path: str, token: str, **params: str) -> dict[str, Any]:
    query = parse.urlencode(params)
    http_request = request.Request(f"{API}/{path}?{query}")
    if token:
        credentials = base64.b64encode(f"{token}:".encode()).decode()
        http_request.add_header("Authorization", f"Basic {credentials}")
    with request.urlopen(http_request, timeout=20) as response:
        return json.loads(response.read().decode())


def scope(pull_request: str, branch: str) -> dict[str, str]:
    return {"pullRequest": pull_request} if pull_request else {"branch": branch}


def analyzed_commit(project: str, token: str, pull_request: str, branch: str) -> str | None:
    if pull_request:
        listing = get("project_pull_requests/list", token, project=project)
        entries = [entry for entry in listing.get("pullRequests", []) if entry["key"] == pull_request]
    else:
        listing = get("project_branches/list", token, project=project)
        entries = [entry for entry in listing.get("branches", []) if entry["name"] == branch]
    return entries[0].get("commit", {}).get("sha") if entries else None


def fetch_gate(
    project: str, token: str, where: dict[str, str], pull_request: str, branch: str, commit: str
) -> dict[str, Any] | None:
    for attempt in range(ATTEMPTS):
        gate = get("qualitygates/project_status", token, projectKey=project, **where)["projectStatus"]
        analyzed = analyzed_commit(project, token, pull_request, branch)
        if gate["status"] != "NONE" and (not commit or not analyzed or analyzed == commit):
            return gate
        if attempt < ATTEMPTS - 1:
            time.sleep(5)
    return None


def fmt_value(metric: str, value: str | None) -> str:
    if value is None:
        return "–"
    if metric.endswith("_rating"):
        return RATINGS.get(value.split(".")[0], value)
    if metric in PERCENT_METRICS:
        return f"{float(value):.1f}%"
    return value


def fmt_limit(condition: dict[str, Any]) -> str:
    metric, threshold = condition["metricKey"], condition.get("errorThreshold")
    if threshold is None:
        return "–"
    value = fmt_value(metric, threshold)
    if metric.endswith("_rating"):
        return f"pior que {value} reprova" if condition["comparator"] == "GT" else value
    return f"mínimo {value}" if condition["comparator"] == "LT" else f"máximo {value}"


def render_gate(gate: dict[str, Any]) -> list[str]:
    rows = ["| Condição | Resultado | Atual | Limite |", "|---|---|---|---|"]
    for condition in gate["conditions"]:
        metric = condition["metricKey"]
        mark = STATUS_MARKS.get(condition["status"], "⚠️")
        rows.append(
            f"| {METRIC_LABELS.get(metric, metric)} | {mark} "
            f"| {fmt_value(metric, condition.get('actualValue'))} | {fmt_limit(condition)} |"
        )
    return rows


def render_issues(project: str, token: str, where: dict[str, str]) -> list[str]:
    new_code = {"inNewCodePeriod": "true"} if "branch" in where else {}
    issues = get(
        "issues/search",
        token,
        componentKeys=project,
        resolved="false",
        ps=str(MAX_ISSUES),
        s="SEVERITY",
        asc="false",
        **new_code,
        **where,
    )
    total = issues.get("total", 0)
    if total == 0:
        return ["**Issues novas:** nenhuma."]
    lines = [f"**Issues novas:** {total}", ""]
    for issue in issues["issues"]:
        path = issue["component"].split(":", 1)[-1]
        mark = SEVERITIES.get(issue["severity"], "⚪")
        lines.append(f"- {mark} `{path}:{issue.get('line', '?')}` {issue['message']} (`{issue['rule']}`)")
    if total > MAX_ISSUES:
        lines.append(f"- … e mais {total - MAX_ISSUES} no SonarCloud.")
    return lines


def build_report(project: str, token: str, pull_request: str, branch: str, commit: str) -> str:
    where = scope(pull_request, branch)
    target = f"PR #{pull_request}" if pull_request else f"branch {branch}"
    link = f"{DASHBOARD}?{parse.urlencode({'id': project, **where})}"
    header = [MARKER.format(project=project), f"### Sonar · `{project}` · {target}", ""]
    try:
        gate = fetch_gate(project, token, where, pull_request, branch, commit)
    except READ_FAILURES as failure:
        return "\n".join(header + [f"Não foi possível ler o SonarCloud: `{failure}`.", "", f"[Abrir]({link})"])
    if gate is None:
        unavailable = "A análise deste commit não está disponível no SonarCloud: o scan pode não ter terminado."
        return "\n".join(header + [unavailable, "", f"[Abrir]({link})"])
    body = [f"**Quality Gate:** {GATE_LABELS.get(gate['status'], gate['status'])}", ""]
    body += render_gate(gate) + [""]
    try:
        body += render_issues(project, token, where)
    except READ_FAILURES as failure:
        body += [f"Não foi possível ler as issues: `{failure}`."]
    return "\n".join(header + body + ["", f"[Abrir no SonarCloud]({link})"])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True)
    parser.add_argument("--pull-request", default="")
    parser.add_argument("--branch", default="main")
    parser.add_argument("--commit", default="")
    arguments = parser.parse_args()
    report = build_report(
        arguments.project,
        os.environ.get("SONAR_TOKEN", ""),
        arguments.pull_request,
        arguments.branch,
        arguments.commit,
    )
    sys.stdout.reconfigure(encoding="utf-8")
    print(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
