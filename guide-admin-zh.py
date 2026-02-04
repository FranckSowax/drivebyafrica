#!/usr/bin/env python3
"""Generate the Driveby Africa Admin Guide PDF - Chinese Version."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
CJK = 'STSong-Light'

MANDARIN = HexColor('#E85D04')
COD_GRAY = HexColor('#1a1a1a')
LIGHT_TEXT = HexColor('#555555')
BORDER_COLOR = HexColor('#E0E0E0')
LIGHT_BG = HexColor('#F8F8F8')
SECTION_BG = HexColor('#FFF5EE')

WIDTH, HEIGHT = A4

styles = {
    'h1': ParagraphStyle('h1', fontName=CJK, fontSize=22, textColor=MANDARIN, spaceBefore=20, spaceAfter=12, leading=30),
    'h2': ParagraphStyle('h2', fontName=CJK, fontSize=16, textColor=COD_GRAY, spaceBefore=16, spaceAfter=8, leading=24),
    'h3': ParagraphStyle('h3', fontName=CJK, fontSize=13, textColor=HexColor('#333333'), spaceBefore=12, spaceAfter=6, leading=20),
    'body': ParagraphStyle('body', fontName=CJK, fontSize=10.5, textColor=HexColor('#333333'), alignment=TA_JUSTIFY, spaceBefore=4, spaceAfter=6, leading=17),
    'tip_text': ParagraphStyle('tip_text', fontName=CJK, fontSize=10, textColor=HexColor('#1B5E20'), leading=16, spaceBefore=2, spaceAfter=2),
    'warn_text': ParagraphStyle('warn_text', fontName=CJK, fontSize=10, textColor=HexColor('#B45309'), leading=16, spaceBefore=2, spaceAfter=2),
    'toc_item': ParagraphStyle('toc_item', fontName=CJK, fontSize=12, textColor=COD_GRAY, spaceBefore=6, spaceAfter=6, leading=20, leftIndent=10),
    'step_num': ParagraphStyle('step_num', fontName='Helvetica-Bold', fontSize=11, textColor=white, alignment=TA_CENTER),
    'step_title': ParagraphStyle('step_title', fontName=CJK, fontSize=11, textColor=COD_GRAY, leading=17),
    'step_desc': ParagraphStyle('step_desc', fontName=CJK, fontSize=9.5, textColor=LIGHT_TEXT, leading=15),
}


def make_tip_box(text, box_type='tip'):
    if box_type == 'tip':
        bg, border, icon = HexColor('#E8F5E9'), HexColor('#4CAF50'), '\u63d0\u793a'
        style = styles['tip_text']
    elif box_type == 'warn':
        bg, border, icon = HexColor('#FFF8E1'), HexColor('#FF9800'), '\u91cd\u8981'
        style = styles['warn_text']
    else:
        bg, border, icon = HexColor('#E3F2FD'), HexColor('#2196F3'), '\u4fe1\u606f'
        style = ParagraphStyle('info_text', parent=styles['tip_text'], textColor=HexColor('#0D47A1'))
    data = [[Paragraph(f'<b>{icon}\uff1a</b> {text}', style)]]
    t = Table(data, colWidths=[WIDTH - 4 * cm])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), bg), ('BOX', (0, 0), (-1, -1), 1, border),
        ('LEFTPADDING', (0, 0), (-1, -1), 14), ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('ROUNDEDCORNERS', [4, 4, 4, 4])]))
    return t


def make_numbered_step(number, title, description):
    num_data = [[Paragraph(str(number), styles['step_num'])]]
    num_table = Table(num_data, colWidths=[24], rowHeights=[24])
    num_table.setStyle(TableStyle([('BACKGROUND', (0, 0), (0, 0), MANDARIN), ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('VALIGN', (0, 0), (0, 0), 'MIDDLE'), ('ROUNDEDCORNERS', [12, 12, 12, 12])]))
    content = [Paragraph(title, styles['step_title'])]
    if description:
        content.append(Paragraph(description, styles['step_desc']))
    data = [[num_table, content]]
    t = Table(data, colWidths=[34, WIDTH - 4.5 * cm])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('LEFTPADDING', (1, 0), (1, 0), 8), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 6)]))
    return t


def make_table(header, rows, col_widths=None):
    data = [header] + rows
    if not col_widths:
        col_widths = [int((WIDTH - 4 * cm) / len(header))] * len(header)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), MANDARIN), ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, -1), CJK), ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 9), ('TEXTCOLOR', (0, 1), (-1, -1), HexColor('#333333')),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return t


def draw_cover(c, doc):
    c.saveState()
    c.setFillColor(COD_GRAY)
    c.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
    c.setFillColor(MANDARIN)
    c.rect(0, HEIGHT - 8 * mm, WIDTH, 8 * mm, fill=1, stroke=0)
    c.setFillColor(HexColor('#2a2a2a'))
    c.circle(WIDTH / 2, HEIGHT / 2 + 40 * mm, 80 * mm, fill=1, stroke=0)
    c.setFillColor(MANDARIN)
    c.roundRect(WIDTH / 2 - 50 * mm, HEIGHT - 75 * mm, 100 * mm, 30 * mm, 6, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 24)
    c.drawCentredString(WIDTH / 2, HEIGHT - 60 * mm, 'DRIVEBY AFRICA')
    c.setFillColor(white)
    c.setFont(CJK, 28)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 + 25 * mm, '\u7ba1\u7406\u5458\u6307\u5357')
    c.setFillColor(HexColor('#FFCCAA'))
    c.setFont(CJK, 16)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 + 5 * mm, '\u5e73\u53f0\u7ba1\u7406')
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 - 10 * mm, '\u4e0e\u5168\u9762\u7ba1\u7406')
    c.setStrokeColor(MANDARIN)
    c.setLineWidth(2)
    c.line(WIDTH / 2 - 40 * mm, HEIGHT / 2 - 25 * mm, WIDTH / 2 + 40 * mm, HEIGHT / 2 - 25 * mm)
    c.setFillColor(HexColor('#888888'))
    c.setFont(CJK, 11)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 - 40 * mm, '\u7248\u672c 2.0 - 2026\u5e742\u6708')
    c.setFillColor(HexColor('#666666'))
    c.setFont(CJK, 9)
    c.drawCentredString(WIDTH / 2, 25 * mm, '\u5185\u90e8\u6587\u4ef6 - \u4ec5\u4f9b Driveby Africa \u7ba1\u7406\u5458\u4f7f\u7528')
    c.setFillColor(MANDARIN)
    c.rect(0, 0, WIDTH, 4 * mm, fill=1, stroke=0)
    c.restoreState()


def header_footer(c, doc):
    c.saveState()
    c.setStrokeColor(MANDARIN)
    c.setLineWidth(1.5)
    c.line(2 * cm, HEIGHT - 1.5 * cm, WIDTH - 2 * cm, HEIGHT - 1.5 * cm)
    c.setFillColor(HexColor('#999999'))
    c.setFont(CJK, 8)
    c.drawString(2 * cm, HEIGHT - 1.3 * cm, 'Driveby Africa - \u7ba1\u7406\u5458\u6307\u5357')
    c.drawRightString(WIDTH - 2 * cm, HEIGHT - 1.3 * cm, 'v2.0')
    c.setStrokeColor(BORDER_COLOR)
    c.setLineWidth(0.5)
    c.line(2 * cm, 1.5 * cm, WIDTH - 2 * cm, 1.5 * cm)
    c.setFillColor(HexColor('#999999'))
    c.setFont(CJK, 8)
    c.drawString(2 * cm, 1 * cm, '\u673a\u5bc6\u6587\u4ef6')
    c.drawRightString(WIDTH - 2 * cm, 1 * cm, f'\u7b2c {doc.page} \u9875')
    c.restoreState()


def bullet(text):
    return Paragraph(f'\u2022 {text}', ParagraphStyle('list', parent=styles['body'], leftIndent=15))


def build_guide():
    output_path = '/Users/user/Downloads/drivebyafrica-main/public/guides/Guide-Admin-Driveby-Africa-ZH.pdf'
    doc = SimpleDocTemplate(output_path, pagesize=A4, topMargin=2.2 * cm, bottomMargin=2 * cm, leftMargin=2 * cm, rightMargin=2 * cm)
    story = []

    story.append(Spacer(1, 1))
    story.append(PageBreak())

    # TOC
    story.append(Paragraph('\u76ee\u5f55', styles['h1']))
    story.append(Spacer(1, 8))
    toc = [
        ('1.', '\u767b\u5f55\u548c\u89d2\u8272'),
        ('2.', '\u4eea\u8868\u677f\u548cKPI'),
        ('3.', '\u8f66\u8f86\u7ba1\u7406'),
        ('4.', '\u6e90\u540c\u6b65'),
        ('5.', '\u8ba2\u5355\u7ba1\u7406'),
        ('6.', '\u62a5\u4ef7\u7ba1\u7406'),
        ('7.', '\u8f66\u8f86\u91cd\u65b0\u5206\u914d'),
        ('8.', '\u7528\u6237\u7ba1\u7406'),
        ('9.', '\u8fd0\u8f93\u8def\u7ebf\u548c\u8d39\u7528'),
        ('10.', '\u8fd0\u8f93\u5408\u4f5c\u4f19\u4f34\uff08\u8d27\u8fd0\u4ee3\u7406\uff09'),
        ('11.', '\u8d27\u5e01\u7ba1\u7406'),
        ('12.', '\u8f66\u8f86\u6279\u6b21'),
        ('13.', '\u901a\u77e5\u548c\u6d88\u606f'),
        ('14.', '\u5e73\u53f0\u8bbe\u7f6e'),
        ('15.', '\u5206\u6790\u548c\u5229\u6da6'),
    ]
    for num, title in toc:
        data = [[Paragraph(f'<b>{num}</b>', ParagraphStyle('n', parent=styles['toc_item'], textColor=MANDARIN)),
                 Paragraph(title, styles['toc_item'])]]
        t = Table(data, colWidths=[30, WIDTH - 4.5 * cm])
        t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2), ('LINEBELOW', (0, 0), (-1, -1), 0.3, HexColor('#EEEEEE'))]))
        story.append(t)
    story.append(PageBreak())

    # S1
    story.append(Paragraph('1. \u767b\u5f55\u548c\u89d2\u8272', styles['h1']))
    story.append(Paragraph('\u7ba1\u7406\u5458\u95e8\u6237\u53ef\u901a\u8fc7 <b>/admin/login</b> \u8bbf\u95ee\u3002\u53ea\u6709\u62e5\u6709 <b>admin</b> \u6216 <b>super_admin</b> \u89d2\u8272\u7684\u7528\u6237\u624d\u80fd\u8bbf\u95ee\u3002', styles['body']))
    story.append(Spacer(1, 6))
    story.append(Paragraph('\u53ef\u7528\u89d2\u8272', styles['h2']))
    story.append(make_table(['\u89d2\u8272', '\u8bbf\u95ee\u6743\u9650', '\u63cf\u8ff0'],
        [['User', '\u516c\u5171\u7f51\u7ad9', '\u6807\u51c6\u5ba2\u6237 - \u6d4f\u89c8\u548c\u62a5\u4ef7'],
         ['Collaborator', '\u534f\u4f5c\u8005\u95e8\u6237', '\u8ba2\u5355\u7ba1\u7406\u3001\u8f66\u8f86\u3001\u6279\u6b21'],
         ['Admin', '\u7ba1\u7406\u5458\u95e8\u6237', '\u5b8c\u5168\u8bbf\u95ee\u6240\u6709\u529f\u80fd'],
         ['Super Admin', '\u7ba1\u7406\u5458\u95e8\u6237', '\u7ba1\u7406\u5458 + \u89d2\u8272\u548c\u8bbe\u7f6e\u7ba1\u7406']], [80, 100, 285]))
    story.append(Spacer(1, 8))
    story.append(make_tip_box('\u4f1a\u8bdd\u901a\u8fc7cookie (dba-auth-marker) \u4fdd\u6301\u6d3b\u52a87\u5929\u3002\u4f7f\u7528\u4fa7\u8fb9\u680f\u4e2d\u7684\u6ce8\u9500\u6309\u94ae\u9000\u51fa\u3002'))
    story.append(PageBreak())

    # S2
    story.append(Paragraph('2. \u4eea\u8868\u677f\u548cKPI', styles['h1']))
    story.append(Paragraph('\u4eea\u8868\u677f\u5b9e\u65f6\u663e\u793a\u5e73\u53f0\u7684\u5173\u952e\u7ee9\u6548\u6307\u6807\u3002', styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('\u4e3b\u8981\u6307\u6807', styles['h2']))
    story.append(make_table(['\u6307\u6807', '\u63cf\u8ff0'],
        [['\u8f66\u8f86\u603b\u6570', '\u6570\u636e\u5e93\u4e2d\u7684\u8f66\u8f86\u6570\u91cf\uff08\u6240\u6709\u6e90\uff09'],
         ['\u7528\u6237', '\u6ce8\u518c\u7528\u6237\u603b\u6570'],
         ['\u62a5\u4ef7', '\u751f\u6210\u7684\u62a5\u4ef7\u603b\u6570'],
         ['\u8ba2\u5355', '\u8fdb\u884c\u4e2d\u7684\u8ba2\u5355\u603b\u6570'],
         ['\u5df2\u6536\u5b9a\u91d1', '\u5df2\u6536\u5230\u7684\u5b9a\u91d1\u603b\u989d (USD)'],
         ['\u8ba2\u5355\u4ef7\u503c', 'FCFA\u8ba2\u5355\u603b\u4ef7\u503c'],
         ['\u63a5\u53d7\u7387', '\u5df2\u63a5\u53d7\u62a5\u4ef7\u7684\u767e\u5206\u6bd4']], [140, 325]))
    story.append(Spacer(1, 8))
    story.append(Paragraph('\u56fe\u8868\u548c\u8d8b\u52bf', styles['h2']))
    story.append(bullet('<b>\u65f6\u95f4\u5e8f\u5217</b>\uff1a7\u5929/30\u5929/90\u5929\u7684\u7528\u6237\u548c\u62a5\u4ef7'))
    story.append(bullet('<b>\u8f66\u8f86\u5e93\u5b58</b>\uff1a\u6309\u6765\u6e90\u7684\u8d8b\u52bf\uff08\u97e9\u56fd\u3001\u4e2d\u56fd\u3001\u8fea\u62dc\uff09'))
    story.append(bullet('<b>\u70ed\u95e8\u76ee\u7684\u5730</b>\uff1a\u524d\u51e0\u540d\u56fd\u5bb6\u53ca\u56fd\u65d7'))
    story.append(bullet('<b>\u70ed\u95e8\u54c1\u724c</b>\uff1a\u6700\u53d7\u6b22\u8fce\u7684\u8f66\u8f86'))
    story.append(bullet('<b>\u6708\u5ea6\u5bf9\u6bd4</b>\uff1a\u7528\u6237/\u62a5\u4ef7/\u8f66\u8f86\u67f1\u72b6\u56fe'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box('\u60a8\u53ef\u4ee5\u624b\u52a8\u8bb0\u5f55\u8f66\u8f86\u5e93\u5b58\u5feb\u7167\u4ee5\u4fbf\u5386\u53f2\u8ddf\u8e2a\u3002', 'info'))
    story.append(PageBreak())

    # S3
    story.append(Paragraph('3. \u8f66\u8f86\u7ba1\u7406', styles['h1']))
    story.append(Paragraph('\u8f66\u8f86\u90e8\u5206\u5305\u542b\u4e09\u4e2a\u9009\u9879\u5361\uff1a<b>\u7edf\u8ba1</b>\u3001<b>\u8f66\u8f86</b>\u548c<b>\u540c\u6b65</b>\u3002', styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('\u7edf\u8ba1', styles['h2']))
    story.append(bullet('\u6309\u72b6\u6001\u7edf\u8ba1\uff1a\u53ef\u7528\u3001\u5df2\u9884\u7559\u3001\u5df2\u552e\u3001\u5f85\u5b9a'))
    story.append(bullet('\u6309\u6765\u6e90\u5206\u5e03\uff1a\u97e9\u56fd\u3001\u4e2d\u56fd\u3001\u8fea\u62dc'))
    story.append(bullet('\u53ef\u89c1 vs \u9690\u85cf\u8f66\u8f86'))
    story.append(bullet('\u5e73\u5747\u8f66\u4ef7'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('\u8f66\u8f86\u5217\u8868', styles['h2']))
    story.append(bullet('<b>\u641c\u7d22</b>\u6309\u54c1\u724c\u3001\u578b\u53f7\u6216\u6e90ID'))
    story.append(bullet('<b>\u7b5b\u9009</b>\uff1a\u72b6\u6001\u3001\u53ef\u89c1\u6027\u3001\u4ef7\u683c\u8303\u56f4'))
    story.append(bullet('<b>\u6279\u91cf\u64cd\u4f5c</b>\uff1a\u6279\u91cf\u66f4\u65b0\u72b6\u6001\u3001\u53ef\u89c1\u6027\u6216\u4ef7\u683c'))
    story.append(bullet('<b>\u6279\u91cf\u5220\u9664</b>\uff1a\u5220\u9664\u591a\u4e2a\u8f66\u8f86'))
    story.append(bullet('<b>\u624b\u52a8\u6dfb\u52a0</b>\uff1a\u521b\u5efa\u5305\u542b\u6240\u6709\u8be6\u60c5\u7684\u8f66\u8f86'))
    story.append(PageBreak())

    # S4
    story.append(Paragraph('4. \u6e90\u540c\u6b65', styles['h1']))
    story.append(Paragraph('\u540c\u6b65\u9009\u9879\u5361\u4ece\u5916\u90e8API\u5bfc\u5165\u8f66\u8f86\uff1a<b>Encar</b>\uff08\u97e9\u56fd\uff09\u3001<b>CHE168/Dongchedi</b>\uff08\u4e2d\u56fd\uff09\u3001<b>Dubicars</b>\uff08\u8fea\u62dc\uff09\u3002', styles['body']))
    story.append(Spacer(1, 8))
    story.append(make_table(['\u6a21\u5f0f', '\u63cf\u8ff0', '\u7528\u9014'],
        [['\u5b8c\u5168\u540c\u6b65', '\u5bfc\u5165\u6240\u6709\u8f66\u8f86', '\u9996\u6b21\u4f7f\u7528\u6216\u5b8c\u5168\u91cd\u65b0\u540c\u6b65'],
         ['\u589e\u91cf\u540c\u6b65', '\u4ec5\u5bfc\u5165\u65b0/\u4fee\u6539\u7684\u8f66\u8f86', '\u65e5\u5e38\u4f7f\u7528']], [90, 200, 175]))
    story.append(Spacer(1, 8))
    story.append(bullet('\u4e0a\u6b21\u540c\u6b65\uff1a\u65e5\u671f\u548c\u65f6\u95f4'))
    story.append(bullet('\u72b6\u6001\uff1a\u8fd0\u884c\u4e2d\u3001\u6210\u529f\u3001\u5931\u8d25'))
    story.append(bullet('\u6dfb\u52a0\u3001\u66f4\u65b0\u3001\u5220\u9664\u7684\u8f66\u8f86\u6570'))
    story.append(bullet('\u5b8c\u6574\u540c\u6b65\u5386\u53f2'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box('\u65e5\u5e38\u66f4\u65b0\u4f18\u5148\u4f7f\u7528\u589e\u91cf\u540c\u6b65\u3002\u5b8c\u5168\u540c\u6b65\u53ef\u80fd\u9700\u8981\u66f4\u957f\u65f6\u95f4\u3002', 'warn'))
    story.append(PageBreak())

    # S5
    story.append(Paragraph('5. \u8ba2\u5355\u7ba1\u7406', styles['h1']))
    story.append(Paragraph('\u8ba2\u5355\u7ba1\u7406\u9075\u5faa14\u6b65\u5de5\u4f5c\u6d41\u7a0b\uff08\u4e0e\u534f\u4f5c\u8005\u6307\u5357\u76f8\u540c\uff09\u3002\u7ba1\u7406\u5458\u62e5\u6709\u989d\u5916\u529f\u80fd\u3002', styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('\u6982\u89c8\u5361\u7247', styles['h2']))
    story.append(bullet('\u5df2\u4ed8\u5b9a\u91d1 / \u5df2\u8d2d\u4e70\u8f66\u8f86 / \u8fd0\u8f93\u4e2d / \u6d77\u8fd0\u4e2d / \u5df2\u4ea4\u4ed8'))
    story.append(bullet('USD\u5b9a\u91d1\u603b\u989d'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('\u8ba2\u5355\u8be6\u60c5\uff08\u5f39\u51fa\u7a97\u53e3\uff09', styles['h2']))
    story.append(bullet('<b>\u53ef\u89c6\u5316\u65f6\u95f4\u7ebf</b>\uff1a14\u6b65'))
    story.append(bullet('<b>\u66f4\u65b0\u8868\u5355</b>\uff1a\u72b6\u6001\u3001\u5907\u6ce8\u3001\u9884\u8ba1\u5230\u8fbe\u3001\u8fd0\u8f93\u5408\u4f5c\u4f19\u4f34'))
    story.append(bullet('<b>\u6587\u4ef6\u90e8\u5206</b>\uff1a\u6309\u6b65\u9aa4\u4e0a\u4f20'))
    story.append(bullet('<b>\u8d22\u52a1\u6458\u8981</b>\uff1a\u8f66\u4ef7\u3001\u8fd0\u8d39\u3001\u4fdd\u9669\u3001\u603b\u8ba1\u3001\u5b9a\u91d1\u3001\u4f59\u989d'))
    story.append(bullet('<b>\u6d3b\u52a8\u5386\u53f2</b>\uff1a\u8c01\u5728\u4f55\u65f6\u505a\u4e86\u4ec0\u4e48\u4fee\u6539'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box('\u201c\u8f66\u8f86\u5df2\u63a5\u6536\u201d\u72b6\u6001\uff08\u7b2c6\u6b65\uff09\u5bf9\u5ba2\u6237\u4e0d\u53ef\u89c1\uff0c\u9700\u8981\u5206\u914d\u8d27\u8fd0\u4ee3\u7406\u3002', 'warn'))
    story.append(PageBreak())

    # S6
    story.append(Paragraph('6. \u62a5\u4ef7\u7ba1\u7406', styles['h1']))
    story.append(Paragraph('\u62a5\u4ef7\u9875\u9762\u663e\u793a\u5b8c\u6574\u7684\u6d41\u7a0b\u7ebf\u548c\u5b9e\u65f6\u7edf\u8ba1\u6570\u636e\u3002', styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('\u62a5\u4ef7\u6d41\u7a0b', styles['h2']))
    story.append(make_table(['\u72b6\u6001', '\u63cf\u8ff0'],
        [['\u5f85\u5ba1\u6838', '\u7b49\u5f85\u7ba1\u7406\u5458\u9a8c\u8bc1\u7684\u62a5\u4ef7'],
         ['\u7b49\u5f85\u4ed8\u6b3e', '\u5df2\u9a8c\u8bc1\uff0c\u7b49\u5f85\u5ba2\u6237\u5b9a\u91d1'],
         ['\u5df2\u63a5\u53d7', '\u5df2\u6536\u5b9a\u91d1\uff0c\u8ba2\u5355\u8fdb\u884c\u4e2d'],
         ['\u5df2\u62d2\u7edd', '\u5ba2\u6237\u6216\u7ba1\u7406\u5458\u62d2\u7edd\u7684\u62a5\u4ef7'],
         ['\u5df2\u91cd\u65b0\u5206\u914d', '\u8f66\u8f86\u5df2\u66f4\u6362\uff0c\u65b0\u62a5\u4ef7\u5df2\u63d0\u51fa'],
         ['\u5df2\u53d1\u9001\u4ef7\u683c', '\u81ea\u5b9a\u4e49\u4ef7\u683c\u5df2\u53d1\u9001\u7ed9\u5ba2\u6237']], [120, 345]))
    story.append(Spacer(1, 10))
    story.append(Paragraph('\u62a5\u4ef7\u64cd\u4f5c', styles['h2']))
    story.append(make_numbered_step(1, '\u9a8c\u8bc1\u62a5\u4ef7', '\u67e5\u770b\u8be6\u60c5\u5e76\u786e\u8ba4\u4ef7\u683c\u3002'))
    story.append(make_numbered_step(2, '\u8bbe\u7f6e\u81ea\u5b9a\u4e49\u4ef7\u683c', '\u8f93\u5165USD\u4ef7\u683c\uff0c\u81ea\u52a8\u8f6c\u6362\u4e3aFCFA\u3002\u6dfb\u52a0\u53ef\u9009\u5907\u6ce8\u3002'))
    story.append(make_numbered_step(3, '\u63a5\u53d7\u6216\u62d2\u7edd', '\u9a8c\u8bc1\u540e\u66f4\u6539\u62a5\u4ef7\u72b6\u6001\u3002'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box('\u81ea\u5b9a\u4e49\u4ef7\u683c\u6309\u5f53\u524dUSD/XAF\u6c47\u7387\u81ea\u52a8\u8f6c\u6362\u3002'))
    story.append(PageBreak())

    # S7
    story.append(Paragraph('7. \u8f66\u8f86\u91cd\u65b0\u5206\u914d', styles['h1']))
    story.append(Paragraph('\u5f53\u8f66\u8f86\u4e0d\u518d\u53ef\u7528\uff08\u5df2\u552e\u3001\u4e0d\u53ef\u7528\u3001\u4f18\u5148\u7ea7\u51b2\u7a81\uff09\u65f6\uff0c\u60a8\u53ef\u4ee5\u5c06\u62a5\u4ef7\u91cd\u65b0\u5206\u914d\u7ed9\u7c7b\u4f3c\u8f66\u8f86\u3002', styles['body']))
    story.append(Spacer(1, 8))
    story.append(make_numbered_step(1, '\u9009\u62e9\u539f\u56e0', '\u5df2\u552e\u3001\u4e0d\u53ef\u7528\u3001\u4f18\u5148\u7ea7\u51b2\u7a81\u3001\u4ef7\u683c\u53d8\u52a8\u3001\u5176\u4ed6\u3002'))
    story.append(make_numbered_step(2, '\u81ea\u52a8\u63a8\u8350\u8f66\u8f86', '\u7cfb\u7edf\u63a8\u83503\u8f86\u7c7b\u4f3c\u8f66\u8f86\uff08\u54c1\u724c/\u578b\u53f7/\u5e74\u4efd/\u4ef7\u683c\uff09\u5e76\u663e\u793a\u76f8\u4f3c\u5ea6\u5206\u6570\u3002'))
    story.append(make_numbered_step(3, '\u786e\u8ba4\u91cd\u65b0\u5206\u914d', '\u5ba2\u6237\u4f1a\u6536\u5230\u901a\u77e5\uff0c\u53ef\u4ee5\u63a5\u53d7\u6216\u62d2\u7edd\u3002'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('\u62a5\u4ef7\u4e2d\u7684<b>\u91cd\u65b0\u5206\u914d</b>\u9009\u9879\u5361\u663e\u793a\u5b8c\u6574\u7684\u91cd\u65b0\u5206\u914d\u5386\u53f2\u3002', styles['body']))
    story.append(PageBreak())

    # S8
    story.append(Paragraph('8. \u7528\u6237\u7ba1\u7406', styles['h1']))
    story.append(Paragraph('\u7528\u6237\u9875\u9762\u663e\u793a\u6240\u6709\u8d26\u6237\u53ca\u5176\u7edf\u8ba1\u6570\u636e\u3002', styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('\u663e\u793a\u7684\u4fe1\u606f', styles['h2']))
    story.append(bullet('<b>\u4e2a\u4eba\u8d44\u6599</b>\uff1a\u59d3\u540d\u3001\u5934\u50cf\u3001\u7535\u8bdd\u3001WhatsApp\u3001\u56fd\u5bb6'))
    story.append(bullet('<b>\u89d2\u8272</b>\uff1a\u5f69\u8272\u5fbd\u7ae0\uff08\u7528\u6237\u3001\u7ba1\u7406\u5458\u3001\u8d85\u7ea7\u7ba1\u7406\u5458\u3001\u534f\u4f5c\u8005\uff09'))
    story.append(bullet('<b>\u9a8c\u8bc1</b>\uff1a\u8d26\u6237\u9a8c\u8bc1\u72b6\u6001'))
    story.append(bullet('<b>\u7edf\u8ba1</b>\uff1a\u62a5\u4ef7\u6570\u3001\u8ba2\u5355\u6570\u3001\u603b\u652f\u51fa'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('\u529f\u80fd', styles['h2']))
    story.append(bullet('\u6309\u59d3\u540d\u3001\u7535\u8bdd\u3001WhatsApp\u6216\u56fd\u5bb6\u641c\u7d22'))
    story.append(bullet('\u53ef\u6392\u5e8f\u5217'))
    story.append(bullet('\u8be6\u7ec6\u4e2a\u4eba\u8d44\u6599\u5f39\u51fa\u7a97\u53e3'))
    story.append(bullet('\u5206\u9875\uff08\u6bcf\u998720\u4e2a\u7528\u6237\uff09'))
    story.append(PageBreak())

    # S9
    story.append(Paragraph('9. \u8fd0\u8f93\u8def\u7ebf\u548c\u8d39\u7528', styles['h1']))
    story.append(Paragraph('\u8fd0\u8f93\u90e8\u5206\u7ba1\u740665+\u4e2a\u975e\u6d32\u76ee\u7684\u5730\u53ca\u5176\u8fd0\u8f93\u8d39\u7528\u3002', styles['body']))
    story.append(Spacer(1, 8))
    story.append(bullet('<b>\u641c\u7d22</b>\u6309\u76ee\u7684\u5730\u6216\u56fd\u5bb6'))
    story.append(bullet('<b>\u53ef\u7f16\u8f91\u8d39\u7528</b> (USD)\uff1a\u97e9\u56fd\u3001\u4e2d\u56fd\u3001\u8fea\u62dc\u768420ft\u96c6\u88c5\u7bb1'))
    story.append(bullet('<b>40ft\u9009\u9879</b>\uff1a40ft\u96c6\u88c5\u7bb1\u53ef\u9009\u8d39\u7528'))
    story.append(bullet('<b>\u542f\u7528/\u7981\u7528</b>\u8def\u7ebf'))
    story.append(bullet('<b>\u6279\u91cf\u7f16\u8f91</b>\uff1a\u540c\u65f6\u66f4\u65b0\u591a\u6761\u8def\u7ebf'))
    story.append(Spacer(1, 8))
    story.append(bullet('<b>\u5408\u4f5c\u4f19\u4f34</b>\uff1a\u7ba1\u7406\u8fd0\u8f93\u516c\u53f8'))
    story.append(bullet('<b>\u6bd4\u8f83</b>\uff1a\u6309\u6765\u6e90\u5e76\u6392\u67e5\u770b\u8d39\u7528'))
    story.append(PageBreak())

    # S10
    story.append(Paragraph('10. \u8fd0\u8f93\u5408\u4f5c\u4f19\u4f34', styles['h1']))
    story.append(Paragraph('\u8d27\u8fd0\u4ee3\u7406\u9875\u9762\u7ba1\u7406\u7269\u6d41\u5408\u4f5c\u4f19\u4f34\u3002', styles['body']))
    story.append(Spacer(1, 8))
    story.append(make_table(['\u5b57\u6bb5', '\u63cf\u8ff0'],
        [['\u540d\u79f0/\u516c\u53f8', '\u5408\u4f5c\u4f19\u4f34\u8eab\u4efd'],
         ['\u56fd\u5bb6/\u6e2f\u53e3', '\u8986\u76d6\u533a\u57df'],
         ['\u8054\u7cfb\u65b9\u5f0f', '\u7535\u8bdd\u3001WhatsApp\u3001\u90ae\u7bb1\u3001\u5730\u5740'],
         ['\u4e13\u4e1a', '\u6807\u7b7e\uff08\u5982\u96c6\u88c5\u7bb1\u3001\u6eda\u88c5\u8239\u3001\u8f66\u8f86\uff09'],
         ['\u8bed\u8a00', '\u4f7f\u7528\u8bed\u8a00'],
         ['\u8bc4\u5206/\u8bc4\u4ef7', '\u5e73\u5747\u8bc4\u5206\u548c\u8bc4\u4ef7\u6570'],
         ['\u72b6\u6001', '\u6d3b\u52a8/\u5df2\u9a8c\u8bc1']], [100, 365]))
    story.append(PageBreak())

    # S11
    story.append(Paragraph('11. \u8d27\u5e01\u7ba1\u7406', styles['h1']))
    story.append(Paragraph('\u8d27\u5e01\u9875\u9762\u914d\u7f6e\u6c47\u7387\u548c\u6d3b\u52a8\u8d27\u5e01\u3002', styles['body']))
    story.append(Spacer(1, 8))
    story.append(bullet('<b>\u6c47\u7387</b>\uff1a\u7f16\u8f91\u76f8\u5bf9\u4e8eUSD\u7684\u6c47\u7387'))
    story.append(bullet('<b>\u5386\u53f2</b>\uff1a\u65e7\u6c47\u7387\u3001\u65b0\u6c47\u7387\u3001\u65e5\u671f\u3001\u5907\u6ce8'))
    story.append(bullet('<b>\u542f\u7528/\u7981\u7528</b>\u8d27\u5e01'))
    story.append(bullet('<b>\u663e\u793a\u987a\u5e8f</b>\uff1a\u81ea\u5b9a\u4e49\u6392\u5e8f'))
    story.append(bullet('<b>\u56fd\u65d7</b>\uff1a\u6309\u56fd\u5bb6\u7684\u89c6\u89c9\u8bc6\u522b'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box('\u6c47\u7387\u76f4\u63a5\u5f71\u54cd\u5411\u5ba2\u6237\u663e\u793a\u7684\u4ef7\u683c\u3002\u8bf7\u5b9a\u671f\u68c0\u67e5\u5176\u51c6\u786e\u6027\u3002', 'warn'))
    story.append(PageBreak())

    # S12
    story.append(Paragraph('12. \u8f66\u8f86\u6279\u6b21', styles['h1']))
    story.append(Paragraph('\u6279\u6b21\u90e8\u5206\u7ba1\u7406\u534f\u4f5c\u8005\u7684\u6279\u6b21\u63d0\u4ea4\u3002', styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('\u9a8c\u8bc1\u5de5\u4f5c\u6d41\u7a0b', styles['h2']))
    story.append(make_numbered_step(1, '\u534f\u4f5c\u8005\u63d0\u4ea4', '\u534f\u4f5c\u8005\u521b\u5efa\u5305\u542b\u6570\u91cf\u3001\u5355\u4ef7\u548c\u8f66\u8f86\u8be6\u60c5\u7684\u6279\u6b21\u3002'))
    story.append(make_numbered_step(2, '\u7ba1\u7406\u5458\u5ba1\u6838', '\u9a8c\u8bc1\u6279\u6b21\u8be6\u60c5\uff1a\u8f66\u8f86\u3001\u4ef7\u683c\u3001\u63cf\u8ff0\u3002'))
    story.append(make_numbered_step(3, '\u6279\u51c6\u6216\u62d2\u7edd', '\u6279\u51c6\u540e\u8f66\u8f86\u53d8\u4e3a\u53ef\u89c1\u3002\u62d2\u7edd\u9700\u9644\u8bf4\u660e\u3002'))
    story.append(PageBreak())

    # S13
    story.append(Paragraph('13. \u901a\u77e5\u548c\u6d88\u606f', styles['h1']))
    story.append(Spacer(1, 6))
    story.append(Paragraph('\u901a\u77e5', styles['h2']))
    story.append(Paragraph('\u901a\u77e5\u9762\u677f\u96c6\u4e2d\u6240\u6709\u5e73\u53f0\u4e8b\u4ef6\u3002', styles['body']))
    story.append(bullet('<b>\u7c7b\u578b</b>\uff1a\u65b0\u8ba2\u5355\u3001\u62a5\u4ef7\u3001\u4ed8\u6b3e\u3001\u72b6\u6001\u66f4\u65b0'))
    story.append(bullet('<b>\u4f18\u5148\u7ea7</b>\uff1a\u7d27\u6025\u3001\u9ad8\u3001\u666e\u901a\u3001\u4f4e'))
    story.append(bullet('<b>\u64cd\u4f5c</b>\uff1a\u6807\u8bb0\u4e3a\u5df2\u8bfb\u3001\u5220\u9664\u3001\u67e5\u770b\u5173\u8054\u5b9e\u4f53'))
    story.append(Spacer(1, 12))
    story.append(Paragraph('\u6d88\u606f/\u804a\u5929', styles['h2']))
    story.append(Paragraph('\u6d88\u606f\u754c\u9762\u5141\u8bb8\u4e0e\u5ba2\u6237\u6c9f\u901a\u3002', styles['body']))
    story.append(bullet('<b>\u5bf9\u8bdd\u5217\u8868</b>\uff1a\u5305\u542b\u6700\u540e\u6d88\u606f\u9884\u89c8'))
    story.append(bullet('<b>\u7b5b\u9009</b>\uff1a\u6d3b\u52a8\u3001\u7b49\u5f85\u4ee3\u7406\u3001\u5df2\u5173\u95ed'))
    story.append(bullet('<b>\u804a\u5929\u754c\u9762</b>\uff1a\u5b8c\u6574\u5386\u53f2\uff0c\u53d1\u9001\u56de\u590d'))
    story.append(bullet('<b>\u76f4\u63a5WhatsApp\u8054\u7cfb</b>'))
    story.append(PageBreak())

    # S14
    story.append(Paragraph('14. \u5e73\u53f0\u8bbe\u7f6e', styles['h1']))
    story.append(Paragraph('\u8bbe\u7f6e\u9875\u9762\u914d\u7f6e\u5e73\u53f0\u3002', styles['body']))
    story.append(Spacer(1, 8))
    story.append(make_table(['\u7c7b\u522b', '\u9009\u9879'],
        [['\u5e38\u89c4', '\u7f51\u7ad9\u540d\u79f0\u3001\u63cf\u8ff0\u3001\u9ed8\u8ba4\u8d27\u5e01\u3001\u8bed\u8a00\u3001\u65f6\u533a'],
         ['\u8054\u7cfb', '\u90ae\u7bb1\u3001\u7535\u8bdd\u3001WhatsApp\u53f7\u7801'],
         ['\u901a\u77e5', '\u542f\u7528/\u7981\u7528\u90ae\u4ef6\u548cWhatsApp'],
         ['\u7ef4\u62a4', '\u542f\u7528/\u7981\u7528\u7ef4\u62a4\u6a21\u5f0f']], [100, 365]))
    story.append(Spacer(1, 8))
    story.append(make_tip_box('\u7ef4\u62a4\u6a21\u5f0f\u4f1a\u5411\u8bbf\u95ee\u8005\u663e\u793a\u4e0d\u53ef\u7528\u9875\u9762\u3002\u7528\u4e8e\u66f4\u65b0\u65f6\u4f7f\u7528\u3002', 'warn'))
    story.append(PageBreak())

    # S15
    story.append(Paragraph('15. \u5206\u6790\u548c\u5229\u6da6', styles['h1']))
    story.append(Paragraph('\u5206\u6790\u9875\u9762\u63d0\u4f9b\u76c8\u5229\u80fd\u529b\u548c\u7ee9\u6548\u7684\u8be6\u7ec6\u89c6\u56fe\u3002', styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('\u5229\u6da6\u5206\u6790', styles['h2']))
    story.append(bullet('<b>\u8ba2\u5355\u603b\u6570</b>\u53ca\u4ef7\u683c\u6570\u636e'))
    story.append(bullet('<b>Driveby\u4ef7\u683c vs \u6e90\u4ef7\u683c</b>\uff1a\u8be6\u7ec6\u5bf9\u6bd4'))
    story.append(bullet('<b>\u603b\u5229\u6da6</b> (USD)'))
    story.append(bullet('<b>\u5e73\u5747\u5229\u6da6\u7387</b>'))
    story.append(bullet('<b>\u6309\u6765\u6e90\u5206\u5e03</b>\uff1a\u97e9\u56fd\u3001\u4e2d\u56fd\u3001\u8fea\u62dc'))
    story.append(Spacer(1, 12))

    final_data = [[Paragraph(
        '<b>\u6280\u672f\u652f\u6301</b><br/><br/>'
        '\u5982\u6709\u4efb\u4f55\u5e73\u53f0\u7ba1\u7406\u95ee\u9898\uff0c\u8bf7\u8054\u7cfbDriveby Africa\u6280\u672f\u56e2\u961f\u3002'
        '\u7d27\u6025\u95ee\u9898\u8bf7\u4f7f\u7528\u5185\u90e8\u6c9f\u901a\u6e20\u9053\u3002',
        ParagraphStyle('final', parent=styles['body'], alignment=TA_CENTER, fontSize=11))]]
    t = Table(final_data, colWidths=[WIDTH - 4 * cm])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), SECTION_BG), ('BOX', (0, 0), (-1, -1), 1.5, MANDARIN),
        ('LEFTPADDING', (0, 0), (-1, -1), 20), ('RIGHTPADDING', (0, 0), (-1, -1), 20),
        ('TOPPADDING', (0, 0), (-1, -1), 16), ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
        ('ROUNDEDCORNERS', [6, 6, 6, 6])]))
    story.append(t)

    doc.build(story, onFirstPage=draw_cover, onLaterPages=header_footer)
    print(f'PDF generated: {output_path}')


if __name__ == '__main__':
    build_guide()
