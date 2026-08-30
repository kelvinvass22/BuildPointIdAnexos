"""
RF16 (novo, pedido do professor) -- gera o recibo de ponto em PDF, com o
`hash_integridade` já existente impresso, pra permitir conferência manual
além da checagem via RF15 (verificar integridade).

Reaproveita o hash que `ponto/services.py` já gera -- não criamos nenhum
mecanismo de assinatura novo aqui. Quando a integração com o BirdID (ver
BIRDID_API_URL/BIRDID_API_TOKEN em core/settings.py) estiver pronta, o
lugar natural pra plugar a assinatura PAdES real é aqui dentro, trocando
o hash impresso por um QR/carimbo assinado.
"""
import io

from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


def gerar_pdf_recibo(marcacao) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A5)
    largura, altura = A5

    y = altura - 20 * mm
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(15 * mm, y, "BuildPoint ID — Recibo de Ponto")

    y -= 10 * mm
    pdf.setFont("Helvetica", 10)
    operario_nome = marcacao.operario.usuario.get_full_name() or marcacao.operario.usuario.username
    linhas = [
        f"Operário: {operario_nome}",
        f"CPF: {marcacao.operario.usuario.cpf}",
        f"Obra: {marcacao.obra.nome} (ART {marcacao.obra.numero_art or '—'})",
        f"Tipo: {marcacao.get_tipo_display()}",
        f"Data/Hora: {marcacao.data_hora:%d/%m/%Y %H:%M:%S}",
        f"NSR: {marcacao.nsr}",
        f"GPS: {marcacao.latitude:.6f}, {marcacao.longitude:.6f} (precisão {marcacao.precisao_gps_metros:.1f} m)",
        f"Dispositivo: {marcacao.dispositivo_id or '—'} ({marcacao.sistema_operacional or '—'})",
        f"Origem: {marcacao.get_origem_display()}",
        f"Registrado por: {marcacao.registrado_por.get_full_name() or marcacao.registrado_por.username}",
    ]
    for linha in linhas:
        pdf.drawString(15 * mm, y, linha)
        y -= 6 * mm

    y -= 4 * mm
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(15 * mm, y, "Hash de integridade (confira em Verificar Integridade no app):")
    y -= 5 * mm
    pdf.setFont("Courier", 8)
    pdf.drawString(15 * mm, y, marcacao.hash_integridade[:32])
    y -= 4 * mm
    pdf.drawString(15 * mm, y, marcacao.hash_integridade[32:])

    pdf.showPage()
    pdf.save()
    return buffer.getvalue()
