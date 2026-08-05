#!/usr/bin/env python3
"""Gera HTML/PDF da Etapa 3 — BuildPoint ID, alinhado ao Figma."""

from __future__ import annotations

import base64
import html
import os
import re
import urllib.error
import urllib.request
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
OUT_DIR = ROOT / "entregaveis"
ASSETS = OUT_DIR / "assets"
HTML_OUT = OUT_DIR / "BuildPoint-ID-Etapa-3.html"
PDF_OUT = OUT_DIR / "BuildPoint-ID-Etapa-3.pdf"

FIGMA_URL = "https://www.figma.com/design/qdE18x1pR8N0mLXbiiba1i/BuildPoint?node-id=0-1"
FIGMA_EMBED = (
    "https://embed.figma.com/design/qdE18x1pR8N0mLXbiiba1i/BuildPoint"
    "?node-id=0-1&embed-host=share"
)
FIGMA_DEV = (
    "https://www.figma.com/design/qdE18x1pR8N0mLXbiiba1i/BuildPoint"
    "?node-id=0-1&m=dev"
)

MERMAID_FILES = [
    ("cdu", DOCS / "01-documento-de-requisitos.md", 0),
    ("classes", DOCS / "03-diagrama-de-classes.md", 0),
    ("seq01", DOCS / "04-diagramas-de-sequencia.md", 0),
    ("seq02", DOCS / "04-diagramas-de-sequencia.md", 1),
    ("seq03", DOCS / "04-diagramas-de-sequencia.md", 2),
    ("ativ", DOCS / "05-diagrama-de-atividades.md", 0),
    ("bpmn", DOCS / "05-diagrama-de-atividades.md", 1),
]

SKIP_RENDER = os.environ.get("SKIP_DIAGRAM_RENDER") == "1"


def extract_mermaid_blocks(text: str) -> list[str]:
    return re.findall(r"```mermaid\n(.*?)```", text, flags=re.S)


def kroki_png(diagram: str) -> bytes | None:
    compressed = zlib.compress(diagram.encode("utf-8"), 9)
    encoded = base64.urlsafe_b64encode(compressed).decode("ascii")
    url = f"https://kroki.io/mermaid/png/{encoded}"
    req = urllib.request.Request(url, headers={"User-Agent": "BuildPoint-PDF/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read()
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"  aviso: falha ao renderizar diagrama via Kroki ({exc})")
        return None


def render_diagrams() -> dict[str, Path]:
    ASSETS.mkdir(parents=True, exist_ok=True)
    paths: dict[str, Path] = {}
    for key, path, index in MERMAID_FILES:
        out_svg = ASSETS / f"{key}.png"
        if SKIP_RENDER and out_svg.exists():
            print(f"  reutilizando {key}.png")
            paths[key] = out_svg
            continue
        blocks = extract_mermaid_blocks(path.read_text(encoding="utf-8"))
        if index >= len(blocks):
            print(f"  aviso: bloco {index} não encontrado em {path.name}")
            continue
        print(f"  renderizando {key}...")
        svg = kroki_png(blocks[index])
        if svg:
            out_svg.write_bytes(svg)
            paths[key] = out_svg
        else:
            out = ASSETS / f"{key}.txt"
            out.write_text(blocks[index], encoding="utf-8")
            paths[key] = out
    return paths


def asset_uri(path: Path) -> str:
    """Caminho relativo a partir de entregaveis/."""
    try:
        return path.relative_to(OUT_DIR).as_posix()
    except ValueError:
        return f"assets/{path.name}"


def img_tag(paths: dict[str, Path], key: str, caption: str) -> str:
    path = paths.get(key)
    if not path:
        return f"<p class='muted'>Diagrama {html.escape(caption)} indisponível.</p>"
    if path.suffix in {".svg", ".png", ".jpg", ".jpeg", ".webp"}:
        src = asset_uri(path)
        return (
            f"<figure class='diagram'>"
            f"<img src='{src}' alt='{html.escape(caption)}'/>"
            f"<figcaption>{html.escape(caption)}</figcaption>"
            f"</figure>"
        )
    code = html.escape(path.read_text(encoding="utf-8"))
    return (
        f"<figure class='diagram'>"
        f"<pre class='mermaid-fallback'>{code}</pre>"
        f"<figcaption>{html.escape(caption)}</figcaption>"
        f"</figure>"
    )


def table(headers: list[str], rows: list[list[str]]) -> str:
    th = "".join(f"<th>{html.escape(h)}</th>" for h in headers)
    body = []
    for row in rows:
        tds = "".join(f"<td>{c}</td>" for c in row)
        body.append(f"<tr>{tds}</tr>")
    return f"<table><thead><tr>{th}</tr></thead><tbody>{''.join(body)}</tbody></table>"


def logo_svg(size: int = 56) -> str:
    return f"""
    <svg class="logo-mark" width="{size}" height="{size}" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="16" fill="#0B6BCB"/>
      <path fill="#fff" d="M32 14c-6.2 0-10 4.2-10 9.2 0 2.4.9 4.5 2.4 6.1-.4.3-.7.6-.9 1H18c-1.1 0-2 .9-2 2v3h6.2c.5 2.6 2.3 4.7 4.8 5.8V48h3v-6.9c.7.1 1.4.2 2 .2s1.3-.1 2-.2V48h3v-6.9c2.5-1.1 4.3-3.2 4.8-5.8H48v-3c0-1.1-.9-2-2-2h-5.5c-.2-.4-.5-.7-.9-1 1.5-1.6 2.4-3.7 2.4-6.1C42 18.2 38.2 14 32 14zm0 3.2c4.3 0 6.8 2.7 6.8 6 0 3.3-2.5 6-6.8 6s-6.8-2.7-6.8-6c0-3.3 2.5-6 6.8-6z"/>
      <path fill="#E8F1FA" d="M22 50h20v3H22z"/>
    </svg>
    """


FIGMA_SCREENS = [
    ("01-inicio.png", "Início / Splash"),
    ("02-inicio-login.png", "Login"),
    ("03-operario-home.png", "Home do Operário"),
    ("04-historico.png", "Histórico"),
    ("05-bater-ponto-instrucao.png", "Instrução Face ID"),
    ("07-bater-ponto-sucesso.png", "Câmara do Operário"),
    ("08-gerente.png", "Home do Gerente"),
    ("09-raio-ponto.png", "Mudar raio do ponto"),
    ("10-cadastro-operario.png", "Cadastro de Operário"),
    ("11-cadastro-obra.png", "Cadastro de Obra"),
    ("12-perfil-dono.png", "Perfil Dono"),
    ("13-bater-ponto-gerente.png", "Bater ponto (Gerente)"),
]


def phone_mockups_html() -> str:
    """Galeria com as telas exportadas da pasta figma/."""
    cards = []
    screens_dir = ASSETS / "figma-screens"
    for filename, label in FIGMA_SCREENS:
        path = screens_dir / filename
        if not path.exists():
            continue
        src = asset_uri(path)
        cards.append(
            "<article class='screen-card'>"
            f"<img src='{src}' alt='{html.escape(label)}'/>"
            f"<p class='phone-label'>{html.escape(label)}</p>"
            "</article>"
        )
    if not cards:
        return "<p class='muted'>Telas do Figma não encontradas em <code>figma/</code>.</p>"
    return f"<div class='screen-gallery'>{''.join(cards)}</div>"


def build_html(paths: dict[str, Path]) -> str:
    cdu = img_tag(paths, "cdu", "Figura 1 — Diagrama de Casos de Uso")
    classes = img_tag(paths, "classes", "Figura 2 — Diagrama de Classes")
    seq01 = img_tag(paths, "seq01", "Figura 3 — Sequência SQ01: Registrar Ponto")
    seq02 = img_tag(paths, "seq02", "Figura 4 — Sequência SQ02: Cadastrar Peão")
    seq03 = img_tag(paths, "seq03", "Figura 5 — Sequência SQ03: Configurar Geofencing")
    ativ = img_tag(paths, "ativ", "Figura 6 — Diagrama de Atividades: Bater Ponto")
    bpmn = img_tag(paths, "bpmn", "Figura 7 — BPMN: Processo de Batida de Ponto")

    rf = table(
        ["ID", "Descrição", "Ator", "Prioridade", "CDU"],
        [
            ["RF01", "Cadastro, edição e exclusão de canteiros de obras", "Dono", "Essencial", "UC01"],
            ["RF02", "Cadastrar gerentes e vinculá-los a obras", "Dono", "Essencial", "UC02"],
            ["RF03", "Dashboard com métricas de custos e frequência", "Dono", "Importante", "UC03"],
            ["RF04", "Delimitar cerca virtual (raio de 5 m) para batida", "Gerente", "Essencial", "UC04"],
            ["RF05", "Cadastrar peão com biometria facial (enrolment)", "Gerente", "Essencial", "UC05"],
            ["RF06", "Validar/efetuar ponto em contingência", "Gerente", "Importante", "UC07"],
            ["RF07", "Marcar ponto por reconhecimento facial no app", "Peão", "Essencial", "UC06"],
            ["RF08", "Validar GPS e bloquear fora do raio da obra", "Peão / Sistema", "Essencial", "UC06, UC10"],
            ["RF09", "Visualizar histórico / espelho de ponto", "Peão", "Essencial", "UC08"],
        ],
    )
    rnf = table(
        ["ID", "Categoria", "Descrição"],
        [
            ["RNF01", "Segurança jurídica", "Logs de ponto com inviolabilidade (Portaria 671/MTE)"],
            ["RNF02", "Desempenho / IA", "Face ID em até 3 s; tolerante a luminosidade e EPIs"],
            ["RNF03", "Confiabilidade", "Geofencing estrito de 5 metros"],
            ["RNF04", "Arquitetura", "Node.js + Firebase; sync em tempo real e modo offline"],
            ["RNF05", "Usabilidade", "Batida de ponto em no máximo 2 cliques"],
            ["RNF06", "Disponibilidade", "Suportar pico de marcações no início do turno"],
            ["RNF07", "Privacidade", "Biometria como dado sensível (LGPD)"],
        ],
    )
    ri = table(
        ["ID", "Descrição", "Tela Figma"],
        [
            ["RI01", "CTA central de destaque para iniciar câmera / bater ponto", "Home · BATER PONTO AGORA"],
            ["RI02", "Feedback claro de GPS / perímetro antes da marcação", "Fluxo Face ID"],
            ["RI03", "Painéis e cards limpos, responsivos, com hierarquia azul", "Histórico / Dashboard"],
        ],
    )
    rs = table(
        ["ID", "Descrição"],
        [
            ["RS01", "RBAC: Peões/Gerentes sem acesso ao dashboard financeiro do Dono"],
            ["RS02", "Armazenar apenas hash/vetor facial criptografado (sem foto pura)"],
            ["RS03", "Log imutável: trabalhador, data/hora, GPS e confiança do Face ID"],
        ],
    )
    rt = table(
        ["ID", "Descrição"],
        [
            ["RT01", "Teste de estresse no pico de batidas (ex.: 07:00)"],
            ["RT02", "Testes de campo com sol forte, fim de tarde e EPIs"],
            ["RT03", "Simulação de GPS spoofing fora da cerca de 5 m"],
        ],
    )
    atores = table(
        ["Ator", "Tipo", "Descrição"],
        [
            ["Dono", "Primário", "Admin master no painel Web: obras, gerentes e dashboard"],
            ["Gerente", "Primário", "Campo: cerca virtual, cadastro de peões e contingência"],
            ["Peão", "Primário", "Bate ponto por Face ID e consulta histórico"],
            ["API Face ID", "Secundário", "Processa vetores faciais e valida identidade"],
            ["Sistema GPS", "Secundário", "Valida marcação dentro do raio de 5 m"],
        ],
    )
    mapa = table(
        ["Caso de uso", "Dono", "Gerente", "Peão", "Externo"],
        [
            ["UC01 Cadastrar Obra", "●", "", "", ""],
            ["UC02 Vincular Gerente", "●", "", "", ""],
            ["UC03 Dashboard", "●", "", "", ""],
            ["UC04 Configurar Raio", "", "●", "", "GPS"],
            ["UC05 Cadastrar Peão", "", "●", "", "Face ID"],
            ["UC06 Registrar Ponto", "", "○", "●", "Face + GPS"],
            ["UC07 Contingência", "", "●", "", "GPS"],
            ["UC08 Histórico", "", "", "●", ""],
        ],
    )
    multiplicidades = table(
        ["Relacionamento", "Multiplicidade", "Regra"],
        [
            ["Dono → Obra", "1 : 0..*", "Um dono administra várias obras"],
            ["Obra → Gerente", "1 : 1", "Uma obra, um gerente no MVP"],
            ["Obra → Peão", "1 : 0..*", "Vários peões por obra"],
            ["Peão → BiometriaFacial", "1 : 1", "Um vetor ativo (sem imagem pura)"],
            ["Peão → MarcacaoPonto", "1 : 0..*", "Histórico de batidas"],
            ["MarcacaoPonto → LogAuditoria", "1 : 1", "Log imutável (Portaria 671)"],
        ],
    )
    checklist = table(
        ["Entregável", "Status"],
        [
            ["Diagrama de Casos de Uso", "Incluído"],
            ["Especificações textuais de CDU (mín. 3)", "5 UCs detalhados"],
            ["Diagrama de Classes", "Incluído"],
            ["Diagramas de Sequência (mín. 2)", "3 diagramas"],
            ["Diagrama de Atividades / BPMN", "Incluído"],
            ["Documentação no GitHub (branch etapa-3 + PR)", "Ver guia de repositórios"],
        ],
    )

    css = """
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap');

:root {
  --navy: #003B78;
  --navy-deep: #002A56;
  --blue: #0B6BCB;
  --blue-bright: #157FDB;
  --sky: #5BB0F0;
  --pastel: #E8F1FA;
  --pastel-2: #F3F7FC;
  --ink: #152033;
  --muted: #5A6B7D;
  --line: #D5E2F0;
  --white: #FFFFFF;
  --ok: #1F9D63;
  --radius: 14px;
  --shadow: 0 10px 30px rgba(0, 59, 120, 0.12);
}

@page {
  size: A4;
  margin: 16mm 14mm 18mm 14mm;
  @bottom-center {
    content: "BuildPoint ID · Etapa 3 · " counter(page) " / " counter(pages);
    font-family: "Source Sans 3", "Segoe UI", sans-serif;
    font-size: 8.5pt;
    color: #5A6B7D;
  }
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  color: var(--ink);
  font-family: "Source Sans 3", "Segoe UI", sans-serif;
  font-size: 10.5pt;
  line-height: 1.5;
  background: var(--pastel-2);
}

/* ===== Web chrome ===== */
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 28px;
  background: linear-gradient(90deg, var(--navy-deep), var(--navy) 45%, var(--blue));
  color: #fff;
  box-shadow: 0 4px 20px rgba(0,42,86,.25);
}
.topbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: Manrope, sans-serif;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.topbar nav {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 9.5pt;
}
.topbar a {
  color: rgba(255,255,255,.88);
  text-decoration: none;
  font-weight: 600;
}
.topbar a:hover { color: #fff; text-decoration: underline; }
.topbar .cta {
  background: #fff;
  color: var(--navy);
  padding: 8px 14px;
  border-radius: 999px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.doc {
  max-width: 980px;
  margin: 0 auto;
  padding: 0 20px 48px;
}

/* ===== Cover (Figma splash) ===== */
.cover {
  margin: 20px 0 28px;
  min-height: 520px;
  border-radius: 28px;
  padding: 48px 44px;
  color: #fff;
  background:
    radial-gradient(circle at 85% 15%, rgba(91,176,240,.35), transparent 40%),
    radial-gradient(circle at 10% 90%, rgba(11,107,203,.45), transparent 45%),
    linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 55%, #0A4F9C 100%);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  page-break-after: always;
  position: relative;
  overflow: hidden;
}
.cover::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(135deg, rgba(255,255,255,.03) 0 2px, transparent 2px 18px);
  pointer-events: none;
}
.cover > * { position: relative; }
.cover-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.22);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 9pt;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.cover h1 {
  margin: 22px 0 8px;
  font-family: Manrope, sans-serif;
  font-size: 40pt;
  line-height: 1.02;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.cover .tagline {
  margin: 0 0 8px;
  font-size: 16pt;
  font-weight: 600;
  color: #D7EBFF;
}
.cover .subtitle {
  max-width: 520px;
  color: rgba(255,255,255,.82);
  font-size: 12pt;
}
.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;
  margin-top: 28px;
  max-width: 640px;
}
.meta-item {
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 12px;
  padding: 12px 14px;
}
.meta-item .label {
  display: block;
  font-size: 8pt;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #A9C8E8;
  margin-bottom: 4px;
}
.meta-item .value { font-weight: 700; font-size: 11pt; }
.cover-footer {
  margin-top: 28px;
  padding-top: 14px;
  border-top: 1px solid rgba(255,255,255,.18);
  font-size: 9.5pt;
  color: #B7D0E8;
}
.cover-footer a { color: #fff; }

/* ===== Sections ===== */
.panel {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 22px 24px;
  margin-bottom: 18px;
  box-shadow: 0 4px 18px rgba(0,59,120,.05);
}
.section-break { page-break-before: always; }
h2 {
  font-family: Manrope, sans-serif;
  font-size: 18pt;
  margin: 0 0 12px;
  color: var(--navy);
  display: flex;
  align-items: center;
  gap: 10px;
  page-break-after: avoid;
}
h2 .num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: var(--pastel);
  color: var(--blue);
  font-size: 11pt;
  font-weight: 800;
}
h3 {
  font-family: Manrope, sans-serif;
  font-size: 12.5pt;
  margin: 18px 0 8px;
  color: var(--navy);
  page-break-after: avoid;
}
h4 { margin: 10px 0 6px; color: var(--blue); }
p { margin: 0 0 8px; }
.lead {
  background: linear-gradient(90deg, var(--pastel), #fff);
  border-left: 4px solid var(--blue);
  border-radius: 0 12px 12px 0;
  padding: 12px 14px;
  margin: 0 0 14px;
}
.badge {
  display: inline-block;
  background: var(--blue);
  color: #fff;
  font-size: 8pt;
  font-weight: 800;
  letter-spacing: .06em;
  padding: 3px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  vertical-align: middle;
}
ul { margin: 0 0 10px 18px; padding: 0; }
li { margin-bottom: 4px; }
a { color: var(--blue); }

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 8px 0 14px;
  font-size: 9pt;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--line);
}
th, td {
  border-bottom: 1px solid var(--line);
  padding: 8px 9px;
  vertical-align: top;
  text-align: left;
}
th {
  background: var(--navy);
  color: #fff;
  font-weight: 700;
}
tr:last-child td { border-bottom: 0; }
tr:nth-child(even) td { background: var(--pastel-2); }

.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 14px 0 4px;
}
.kpi {
  background: linear-gradient(180deg, var(--pastel), #fff);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px;
}
.kpi .n {
  font-family: Manrope, sans-serif;
  font-size: 22pt;
  font-weight: 800;
  color: var(--navy);
  line-height: 1;
}
.kpi .t {
  font-size: 8.5pt;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .05em;
  margin-top: 4px;
}

/* Design tokens */
.swatches {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin: 12px 0 8px;
}
.swatch {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #fff;
}
.swatch .chip { height: 52px; }
.swatch .meta { padding: 8px 10px; font-size: 8.5pt; }
.swatch .meta b { display: block; font-family: Manrope, sans-serif; color: var(--navy); }
.swatch .meta span { color: var(--muted); }

/* Telas reais do Figma */
.screen-gallery {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin: 14px 0 10px;
}
.screen-card {
  text-align: center;
  page-break-inside: avoid;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 4px 14px rgba(0,59,120,.06);
}
.screen-card img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: #f8fafc;
}
.phone-label {
  margin: 8px 0 2px;
  font-size: 8.5pt;
  font-weight: 700;
  color: var(--muted);
}

/* Figma embed */
.figma-frame {
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: var(--shadow);
  margin: 10px 0 8px;
}
.figma-frame iframe {
  display: block;
  width: 100%;
  height: 480px;
  border: 0;
}
.figma-shot img {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--line);
}
.figma-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 0;
}
.figma-links a {
  display: inline-block;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--pastel);
  color: var(--navy);
  text-decoration: none;
  font-weight: 700;
  font-size: 9pt;
  border: 1px solid var(--line);
}
.figma-links a.primary {
  background: var(--blue);
  color: #fff;
  border-color: var(--blue);
}

figure.diagram {
  margin: 10px 0 16px;
  padding: 12px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  page-break-inside: avoid;
}
figure.diagram img {
  display: block;
  width: 100%;
  max-height: 210mm;
  object-fit: contain;
}
figcaption {
  margin-top: 8px;
  font-size: 9pt;
  color: var(--muted);
  text-align: center;
}
.mermaid-fallback {
  white-space: pre-wrap;
  font-size: 7.5pt;
  background: var(--pastel-2);
  padding: 8px;
}
.toc { columns: 2; gap: 24px; }
.toc a { color: var(--navy); text-decoration: none; font-weight: 600; }
.toc li { margin-bottom: 6px; }
.muted { color: var(--muted); }
code {
  background: var(--pastel);
  padding: 1px 5px;
  border-radius: 5px;
  font-size: 9pt;
}
.footer-note {
  margin-top: 16px;
  font-size: 9pt;
  color: var(--muted);
  border-top: 1px solid var(--line);
  padding-top: 10px;
}
.uc-card {
  background: var(--pastel-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 10px;
  page-break-inside: avoid;
}
.uc-card h3 { margin-top: 0; }

@media screen and (max-width: 900px) {
  .screen-gallery { grid-template-columns: repeat(2, 1fr); }
  .swatches { grid-template-columns: repeat(3, 1fr); }
  .toc { columns: 1; }
  .topbar { flex-direction: column; align-items: flex-start; }
}
@media screen and (max-width: 560px) {
  .screen-gallery, .kpi-row, .meta-grid, .swatches { grid-template-columns: 1fr 1fr; }
  .cover { padding: 28px 22px; border-radius: 18px; }
  .cover h1 { font-size: 28pt; }
}

@media print {
  body { background: #fff; }
  .topbar, .screen-only { display: none !important; }
  .doc { max-width: none; padding: 0; }
  .cover {
    margin: 0;
    border-radius: 0;
    min-height: 250mm;
    box-shadow: none;
  }
  .panel {
    box-shadow: none;
    border-radius: 0;
    border: 0;
    padding: 0;
    margin-bottom: 10px;
  }
  .screen-gallery { grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .screen-card { box-shadow: none; }
}
"""

    mockups = phone_mockups_html()

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>BuildPoint ID — Documentação Etapa 3</title>
  <meta name="description" content="Documentação técnica BuildPoint ID alinhada ao Figma — requisitos, UML e repositórios."/>
  <style>{css}</style>
</head>
<body>
  <header class="topbar screen-only">
    <div class="topbar-brand">
      {logo_svg(36)}
      <span>BuildPoint ID · Etapa 3</span>
    </div>
    <nav>
      <a href="#design">Design</a>
      <a href="#intro">Escopo</a>
      <a href="#cdu">Casos de uso</a>
      <a href="#requisitos">Requisitos</a>
      <a href="#classes">Classes</a>
      <a href="#sequencia">Sequência</a>
      <a href="#atividades">Atividades</a>
      <a href="#repos">Repos</a>
    </nav>
    <a class="cta" href="{FIGMA_URL}" target="_blank" rel="noopener">Abrir Figma</a>
  </header>

  <main class="doc">
    <section class="cover">
      <div>
        <div class="cover-kicker">{logo_svg(22)} Documentação técnica · Etapa 3</div>
        <h1>BuildPoint ID</h1>
        <p class="tagline">Gestão inteligente de ponto</p>
        <p class="subtitle">Requisitos, modelagem UML/BPMN e guia dos repositórios — visual alinhado ao
          <a href="{FIGMA_URL}">Figma BuildPoint</a>.</p>
        <div class="meta-grid">
          <div class="meta-item"><span class="label">Equipe</span><span class="value">Emyliano · João Gabriel · Kelvin · Lucas</span></div>
          <div class="meta-item"><span class="label">Produto</span><span class="value">Ponto eletrônico · Face ID · Geofencing 5 m</span></div>
          <div class="meta-item"><span class="label">Stack</span><span class="value">Node.js · Firebase · Web · App móvel</span></div>
          <div class="meta-item"><span class="label">Conformidade</span><span class="value">Portaria 671/MTE · LGPD</span></div>
        </div>
      </div>
      <div class="cover-footer">
        Design system extraído do Figma · Branch de entrega <code>etapa-3</code> + PR
      </div>
    </section>

    <section class="panel" id="sumario">
      <h2><span class="num">0</span> Sumário</h2>
      <ol class="toc">
        <li><a href="#design">Identidade visual (Figma)</a></li>
        <li><a href="#intro">Introdução e escopo</a></li>
        <li><a href="#atores">Atores e visão do produto</a></li>
        <li><a href="#cdu">Diagrama de casos de uso</a></li>
        <li><a href="#requisitos">Requisitos do sistema</a></li>
        <li><a href="#specs">Especificações textuais de CDU</a></li>
        <li><a href="#classes">Diagrama de classes</a></li>
        <li><a href="#sequencia">Diagramas de sequência</a></li>
        <li><a href="#atividades">Atividades / BPMN</a></li>
        <li><a href="#repos">Repositórios back e front</a></li>
        <li><a href="#checklist">Checklist da Etapa 3</a></li>
      </ol>
      <div class="kpi-row">
        <div class="kpi"><div class="n">9</div><div class="t">Requisitos funcionais</div></div>
        <div class="kpi"><div class="n">10</div><div class="t">Casos de uso</div></div>
        <div class="kpi"><div class="n">7</div><div class="t">Diagramas modelados</div></div>
      </div>
    </section>

    <section class="panel section-break" id="design">
      <h2><span class="num">1</span> Identidade visual (Figma)</h2>
      <p class="lead">Paleta, tipografia e fluxos do app peão extraídos do arquivo
        <strong>BuildPoint</strong> no Figma — navy profundo, azul de ação e superfícies pastel.</p>

      <div class="swatches">
        <div class="swatch"><div class="chip" style="background:#002A56"></div><div class="meta"><b>Navy Deep</b><span>#002A56 · capa / splash</span></div></div>
        <div class="swatch"><div class="chip" style="background:#003B78"></div><div class="meta"><b>Navy</b><span>#003B78 · headers / tabbar</span></div></div>
        <div class="swatch"><div class="chip" style="background:#0B6BCB"></div><div class="meta"><b>Action Blue</b><span>#0B6BCB · CTAs</span></div></div>
        <div class="swatch"><div class="chip" style="background:#5BB0F0"></div><div class="meta"><b>Sky</b><span>#5BB0F0 · highlights</span></div></div>
        <div class="swatch"><div class="chip" style="background:#E8F1FA"></div><div class="meta"><b>Pastel</b><span>#E8F1FA · backgrounds</span></div></div>
      </div>

      <h3>Telas do app (exportadas do Figma)</h3>
      <p class="muted">Arquivos da pasta <code>figma/</code> do projeto.</p>
      {mockups}

      <div class="figma-links">
        <a class="primary" href="{FIGMA_URL}" target="_blank" rel="noopener">Abrir design no Figma</a>
        <a href="{FIGMA_DEV}" target="_blank" rel="noopener">Modo Dev Mode</a>
        <a href="https://gamma.app/docs/BuildPoint-ID-tlfdcysve8uy1ji" target="_blank" rel="noopener">Apresentação Gamma</a>
      </div>

      <div class="screen-only">
        <h3>Embed do Figma</h3>
        <div class="figma-frame">
          <iframe
            src="{FIGMA_EMBED}"
            allowfullscreen
            loading="lazy"
            title="Figma BuildPoint"></iframe>
        </div>
      </div>
    </section>

    <section class="panel section-break" id="intro">
      <h2><span class="num">2</span> Introdução e escopo</h2>
      <p class="lead">O BuildPoint ID é um sistema de controle de ponto eletrônico descentralizado para canteiros de obras, com painel Web corporativo e apps móveis que validam presença por reconhecimento facial e cerca virtual de 5 metros.</p>
      <h3>Incluído no MVP</h3>
      <ul>
        <li>Gestão de obras e gerentes (Dono)</li>
        <li>Geofencing e cadastro biométrico de peões (Gerente)</li>
        <li>Batida de ponto Face ID + GPS, inclusive offline (Peão)</li>
        <li>Histórico de dias trabalhados e dashboard de frequência</li>
      </ul>
      <h3>Fora do escopo</h3>
      <ul>
        <li>Folha de pagamento completa, holerites e gestão de benefícios</li>
      </ul>
    </section>

    <section class="panel" id="atores">
      <h2><span class="num">3</span> Atores e visão do produto</h2>
      {atores}
      <h3>Arquitetura lógica</h3>
      <ul>
        <li><strong>Painel Web</strong> — React/Next.js para o Dono</li>
        <li><strong>App móvel</strong> — React Native ou Flutter (telas do Figma: Peão/Gerente)</li>
        <li><strong>Backend</strong> — Node.js + Firebase (auth, sync, logs)</li>
      </ul>
    </section>

    <section class="panel section-break" id="cdu">
      <h2><span class="num">4</span> Diagrama de casos de uso</h2>
      <p>Completo e coerente com a Etapa 2.</p>
      {cdu}
      <h3>Mapa ator × caso de uso</h3>
      {mapa}
    </section>

    <section class="panel section-break" id="requisitos">
      <h2><span class="num">5</span> Requisitos do sistema</h2>
      <h3>5.1 Funcionais (RF)</h3>
      {rf}
      <h3>5.2 Não funcionais (RNF)</h3>
      {rnf}
      <h3>5.3 Interface (RI) — alinhados ao Figma</h3>
      {ri}
      <h3>5.4 Segurança (RS)</h3>
      {rs}
      <h3>5.5 Testes (RT)</h3>
      {rt}
    </section>

    <section class="panel section-break" id="specs">
      <h2><span class="num">6</span> Especificações textuais de CDU</h2>
      <p>Mínimo 3 — entregues 5, com fluxos e pré/pós-condições.</p>

      <div class="uc-card">
        <h3>UC01 — Cadastrar Obra e Vincular Gerente</h3>
        <p><strong>Ator:</strong> Dono · <strong>Pré:</strong> autenticado no painel Web · <strong>Pós:</strong> obra persistida e gerente vinculado.</p>
        <p><strong>Fluxo:</strong> Obras → Cadastrar Nova Obra → nome/endereço/coordenadas → selecionar gerente → Salvar.</p>
        <p><strong>Alternativas:</strong> gerente inexistente (cadastro inline); campos vazios (bloqueio).</p>
      </div>
      <div class="uc-card">
        <h3>UC04 — Configurar Raio de Ponto (Geofencing)</h3>
        <p><strong>Ator:</strong> Gerente · <strong>Pré:</strong> logado e no canteiro · <strong>Pós:</strong> cerca de 5 m atualizada.</p>
        <p><strong>Fluxo:</strong> Configurações → Registrar Raio → GPS → confirmar → Salvar Perímetro.</p>
        <p><strong>Alternativa:</strong> GPS fraco (&gt; 10 m) → alta precisão / céu aberto.</p>
      </div>
      <div class="uc-card">
        <h3>UC05 — Cadastrar Peão com Biometria Facial</h3>
        <p><strong>Ator:</strong> Gerente · <strong>Pós:</strong> peão com vetor facial válido.</p>
        <p><strong>Fluxo:</strong> Trabalhadores → dados → capturar biometria → extrair vetores → Firebase.</p>
        <p><strong>Alternativa:</strong> pouca luz / EPI obstruindo → nova captura.</p>
      </div>
      <div class="uc-card">
        <h3>UC06 — Registrar Ponto Eletrônico</h3>
        <p><strong>Atores:</strong> Peão (principal), Gerente (contingência).</p>
        <p><strong>Fluxo Figma:</strong> Home → <em>BATER PONTO AGORA</em> → moldura facial → confirmação <em>Tudo certo!</em>.</p>
        <p><strong>Regras:</strong> GPS 5 m · Face ID ≤ 3 s · offline com sync · log imutável.</p>
      </div>
      <div class="uc-card">
        <h3>UC08 — Consultar Histórico de Dias Trabalhados</h3>
        <p><strong>Ator:</strong> Peão · Tela Figma <em>Meus Registros</em> (horas do dia / mês + lista).</p>
        <p><strong>Alternativa:</strong> sem registros → mensagem amigável.</p>
      </div>
    </section>

    <section class="panel section-break" id="classes">
      <h2><span class="num">7</span> Diagrama de classes</h2>
      <p>Entidades, atributos, relacionamentos e multiplicidades.</p>
      {classes}
      <h3>Multiplicidades</h3>
      {multiplicidades}
    </section>

    <section class="panel section-break" id="sequencia">
      <h2><span class="num">8</span> Diagramas de sequência</h2>
      <p>Mínimo 2 — entregues 3.</p>
      <h3>SQ01 — Registrar ponto eletrônico</h3>
      {seq01}
    </section>

    <section class="panel section-break">
      <h3>SQ02 — Cadastrar peão com biometria</h3>
      {seq02}
    </section>

    <section class="panel section-break">
      <h3>SQ03 — Configurar raio de ponto</h3>
      {seq03}
    </section>

    <section class="panel section-break" id="atividades">
      <h2><span class="num">9</span> Diagrama de atividades / BPMN</h2>
      <p>Fluxo de processo modelado.</p>
      <h3>Atividades — Bater ponto</h3>
      {ativ}
      <h3>BPMN — Visão de negócio</h3>
      {bpmn}
    </section>

    <section class="panel section-break" id="repos">
      <h2><span class="num">10</span> Repositórios backend e frontend</h2>
      <p>Documentação no GitHub com branch <code>etapa-3</code> + PR.</p>
      <ol>
        <li>Criar <strong>buildpoint-backend</strong> e <strong>buildpoint-frontend</strong> no GitHub.</li>
        <li>Branch <code>etapa-3</code> + pasta <code>docs/</code> com esta documentação.</li>
        <li>Backend: Node.js + Express + Firebase Admin (<code>/health</code>).</li>
        <li>Frontend/App: implementar telas do Figma (splash, login, home, histórico, Face ID, sucesso).</li>
        <li><code>git push -u origin etapa-3</code> → Pull Request <code>etapa-3 → main</code>.</li>
        <li>Colaboradores: Emyliano, João Gabriel, Kelvin e Lucas Galindo.</li>
      </ol>
      <p class="muted">Detalhamento em <code>docs/02-passo-a-passo-repositorios.md</code>.</p>
    </section>

    <section class="panel" id="checklist">
      <h2><span class="num">11</span> Checklist da Etapa 3</h2>
      {checklist}
      <p class="footer-note">
        Visual baseado no
        <a href="{FIGMA_URL}">Figma BuildPoint</a>
        · Documento gerado por <code>scripts/gerar_pdf.py</code>
        · Equipe BuildPoint ID
      </p>
    </section>
  </main>
</body>
</html>
"""


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print("→ Renderizando diagramas Mermaid (Kroki)...")
    paths = render_diagrams()
    print("→ Montando HTML alinhado ao Figma...")
    html_doc = build_html(paths)
    HTML_OUT.write_text(html_doc, encoding="utf-8")
    print(f"  HTML: {HTML_OUT}")

    print("→ Gerando PDF com WeasyPrint...")
    from weasyprint import HTML

    HTML(filename=str(HTML_OUT), base_url=str(OUT_DIR)).write_pdf(str(PDF_OUT))
    print(f"  PDF:  {PDF_OUT}")
    print("✓ Concluído.")


if __name__ == "__main__":
    main()
