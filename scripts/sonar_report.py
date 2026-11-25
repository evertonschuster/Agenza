"""Summarize a SonarCloud analysis for a pull request (or a branch) as Markdown.

Reads the public SonarCloud web API with the standard library only, so the same file runs on
a CI runner and locally. It never fails the job: the quality gate is enforced by the scanner
(`sonar.qualitygate.wait=true`); this report only makes the result visible.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
from typing import Any
from urllib import error, parse, request

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
SEVERITIES = {"BLOCKER": "🔴", "CRITICAL": "🔴", "MAJOR": "🟠", "MINOR": "🟡", "INFO": "⚪"}
MAX_ISSUES = 10
MARKER = "<!-- sonar-report:{project} -->"


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


def fetch_gate(project: str, token: str, where: dict[str, str]) -> dict[str, Any] | None:
    for attempt in range(6):
        gate = get("qualitygates/project_status", token, projectKey=project, **where)
        if gate["projectStatus"]["status"] != "NONE":
            return gate["projectStatus"]
        if attempt < 5:
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
        mark = "✅" if condition["status"] == "OK" else "❌"
        rows.append(
            f"| {METRIC_LABELS.get(metric, metric)} | {mark} "
            f"| {fmt_value(metric, condition.get('actualValue'))} | {fmt_limit(condition)} |"
        )
    return rows


def render_issues(project: str, token: str, where: dict[str, str]) -> list[str]:
    issues = get(
        "issues/search",
        token,
        componentKeys=project,
        resolved="false",
        ps=str(MAX_ISSUES),
        s="SEVERITY",
        asc="false",
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


def build_report(project: str, token: str, pull_request: str, branch: str) -> str:
    where = scope(pull_request, branch)
    target = f"PR #{pull_request}" if pull_request else f"branch {branch}"
    link = f"{DASHBOARD}?{parse.urlencode({'id': project, **where})}"
    header = [MARKER.format(project=project), f"### Sonar · `{project}` · {target}", ""]
    try:
        gate = fetch_gate(project, token, where)
        if gate is None:
            return "\n".join(header + ["Análise ainda não disponível no SonarCloud.", "", f"[Abrir]({link})"])
        passed = gate["status"] == "OK"
        body = [f"**Quality Gate:** {'✅ aprovado' if passed else '❌ reprovado'}", ""]
        body += render_gate(gate) + [""] + render_issues(project, token, where)
    except (error.URLError, TimeoutError, KeyError, ValueError) as failure:
        return "\n".join(header + [f"Não foi possível ler o SonarCloud: `{failure}`.", "", f"[Abrir]({link})"])
    return "\n".join(header + body + ["", f"[Abrir no SonarCloud]({link})"])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True)
    parser.add_argument("--pull-request", default="")
    parser.add_argument("--branch", default="main")
    arguments = parser.parse_args()
    report = build_report(
        arguments.project,
        os.environ.get("SONAR_TOKEN", ""),
        arguments.pull_request,
        arguments.branch,
    )
    sys.stdout.reconfigure(encoding="utf-8")
    print(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
