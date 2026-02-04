#!/usr/bin/env python3
"""Generate the Driveby Africa Collaborator Guide PDF - Chinese Version."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, ListFlowable, ListItem
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfgen import canvas as canvasmod
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

# Register CJK fonts
pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
pdfmetrics.registerFont(UnicodeCIDFont('MSung-Light'))

# CJK font name
CJK_FONT = 'STSong-Light'
CJK_BOLD = 'STSong-Light'  # CID fonts don't have bold variant, we simulate with tags

# Brand colors
MANDARIN = HexColor('#E85D04')
JEWEL = HexColor('#1B7A43')
COD_GRAY = HexColor('#1a1a1a')
DARK_BG = HexColor('#2d2d2d')
LIGHT_TEXT = HexColor('#555555')
BORDER_COLOR = HexColor('#E0E0E0')
LIGHT_BG = HexColor('#F8F8F8')
SECTION_BG = HexColor('#FFF5EE')

WIDTH, HEIGHT = A4

# Styles using CJK font
styles = {
    'cover_title': ParagraphStyle(
        'cover_title', fontName='Helvetica-Bold', fontSize=32,
        textColor=white, alignment=TA_CENTER, leading=40,
    ),
    'cover_subtitle': ParagraphStyle(
        'cover_subtitle', fontName=CJK_FONT, fontSize=16,
        textColor=HexColor('#FFCCAA'), alignment=TA_CENTER, leading=24,
    ),
    'h1': ParagraphStyle(
        'h1', fontName=CJK_FONT, fontSize=22,
        textColor=MANDARIN, spaceBefore=20, spaceAfter=12, leading=30,
    ),
    'h2': ParagraphStyle(
        'h2', fontName=CJK_FONT, fontSize=16,
        textColor=COD_GRAY, spaceBefore=16, spaceAfter=8, leading=24,
    ),
    'h3': ParagraphStyle(
        'h3', fontName=CJK_FONT, fontSize=13,
        textColor=HexColor('#333333'), spaceBefore=12, spaceAfter=6, leading=20,
    ),
    'body': ParagraphStyle(
        'body', fontName=CJK_FONT, fontSize=10.5,
        textColor=HexColor('#333333'), alignment=TA_JUSTIFY,
        spaceBefore=4, spaceAfter=6, leading=17,
    ),
    'body_bold': ParagraphStyle(
        'body_bold', fontName=CJK_FONT, fontSize=10.5,
        textColor=HexColor('#333333'), spaceBefore=4, spaceAfter=6, leading=17,
    ),
    'small': ParagraphStyle(
        'small', fontName=CJK_FONT, fontSize=9,
        textColor=LIGHT_TEXT, leading=14,
    ),
    'tip_text': ParagraphStyle(
        'tip_text', fontName=CJK_FONT, fontSize=10,
        textColor=HexColor('#1B5E20'), leading=16,
        spaceBefore=2, spaceAfter=2,
    ),
    'warn_text': ParagraphStyle(
        'warn_text', fontName=CJK_FONT, fontSize=10,
        textColor=HexColor('#B45309'), leading=16,
        spaceBefore=2, spaceAfter=2,
    ),
    'toc_item': ParagraphStyle(
        'toc_item', fontName=CJK_FONT, fontSize=12,
        textColor=COD_GRAY, spaceBefore=6, spaceAfter=6, leading=20,
        leftIndent=10,
    ),
    'toc_section': ParagraphStyle(
        'toc_section', fontName=CJK_FONT, fontSize=13,
        textColor=MANDARIN, spaceBefore=12, spaceAfter=4, leading=20,
    ),
    'step_num': ParagraphStyle(
        'step_num', fontName='Helvetica-Bold', fontSize=11,
        textColor=white, alignment=TA_CENTER,
    ),
    'step_title': ParagraphStyle(
        'step_title', fontName=CJK_FONT, fontSize=11,
        textColor=COD_GRAY, leading=17,
    ),
    'step_desc': ParagraphStyle(
        'step_desc', fontName=CJK_FONT, fontSize=9.5,
        textColor=LIGHT_TEXT, leading=15,
    ),
}


def make_tip_box(text, box_type='tip'):
    if box_type == 'tip':
        bg = HexColor('#E8F5E9')
        border = HexColor('#4CAF50')
        icon = '\u63d0\u793a'  # 提示
        style = styles['tip_text']
    elif box_type == 'warn':
        bg = HexColor('#FFF8E1')
        border = HexColor('#FF9800')
        icon = '\u91cd\u8981'  # 重要
        style = styles['warn_text']
    else:
        bg = HexColor('#E3F2FD')
        border = HexColor('#2196F3')
        icon = '\u4fe1\u606f'  # 信息
        style = ParagraphStyle('info_text', parent=styles['tip_text'], textColor=HexColor('#0D47A1'))

    data = [[Paragraph(f'<b>{icon}\uff1a</b> {text}', style)]]
    t = Table(data, colWidths=[WIDTH - 4 * cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg),
        ('BOX', (0, 0), (-1, -1), 1, border),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    return t


def make_numbered_step(number, title, description):
    num_data = [[Paragraph(str(number), styles['step_num'])]]
    num_table = Table(num_data, colWidths=[24], rowHeights=[24])
    num_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), MANDARIN),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
        ('ROUNDEDCORNERS', [12, 12, 12, 12]),
    ]))

    content = []
    content.append(Paragraph(title, styles['step_title']))
    if description:
        content.append(Paragraph(description, styles['step_desc']))

    data = [[num_table, content]]
    t = Table(data, colWidths=[34, WIDTH - 4.5 * cm])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('LEFTPADDING', (1, 0), (1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t


def make_status_table():
    header = ['\u6b65\u9aa4', '\u72b6\u6001', '\u6240\u9700\u6587\u4ef6', '\u534f\u4f5c\u8005\u64cd\u4f5c']
    # 步骤, 状态, 所需文件, 协作者操作

    rows = [
        ['1', '\u5b9a\u91d1\u5df2\u4ed8', '\u65e0', '\u786e\u8ba4\u6536\u5230\u4ed8\u6b3e'],
        ['2', '\u8f66\u8f86\u5df2\u9501\u5b9a', '\u8f66\u8f86\u7167\u7247', '\u4e0a\u4f20\u5f53\u524d\u7167\u7247'],
        ['3', '\u68c0\u67e5\u5df2\u53d1\u9001', '\u68c0\u67e5\u62a5\u544a', '\u4e0a\u4f20\u62a5\u544a (PDF/\u7167\u7247)'],
        ['4', '\u5168\u989d\u4ed8\u6b3e\u5df2\u6536', 'Driveby\u53d1\u7968 (\u81ea\u52a8)', '\u786e\u8ba4\u5168\u989d\u4ed8\u6b3e'],
        ['5', '\u8f66\u8f86\u5df2\u8d2d\u4e70', '\u8d2d\u4e70\u53d1\u7968 (\u5185\u90e8)', '\u8f93\u5165\u5b9e\u9645\u8d2d\u4e70\u4ef7\u683c'],
        ['6', '\u8f66\u8f86\u5df2\u63a5\u6536', '\u63a5\u6536\u7167\u7247 (\u5185\u90e8)', '\u5206\u914d\u8fd0\u8f93\u5408\u4f5c\u4f19\u4f34'],
        ['7', '\u51fa\u53e3\u6d77\u5173', '\u51fa\u53e3\u6d77\u5173\u6587\u4ef6 (\u5185\u90e8)', '\u4e0a\u4f20\u51fa\u53e3\u6587\u4ef6'],
        ['8', '\u8fd0\u8f93\u4e2d', '\u65e0', '\u66f4\u65b0\u72b6\u6001'],
        ['9', '\u5728\u6e2f\u53e3', '\u5c01\u6761+\u88c5\u8f7d\u7167\u7247', '\u4e0a\u4f20\u96c6\u88c5\u7bb1\u7167\u7247'],
        ['10', '\u6d77\u8fd0\u4e2d', '\u8ddf\u8e2a\u94fe\u63a5', '\u6dfb\u52a0\u8ddf\u8e2a\u94fe\u63a5'],
        ['11', '\u6587\u4ef6\u5c31\u7eea', '\u63d0\u5355\u3001\u88c5\u7bb1\u5355\u3001\u653e\u884c\u8bc1', '\u4e0a\u4f20\u6240\u6709\u6587\u4ef6'],
        ['12', '\u6d77\u5173\u6e05\u5173', '\u65e0', '\u8ddf\u8fdb\u6e05\u5173\u8fdb\u5ea6'],
        ['13', '\u53ef\u63d0\u8d27', '\u65e0', '\u901a\u77e5\u5ba2\u6237'],
        ['14', '\u5df2\u4ea4\u4ed8', '\u65e0', '\u786e\u8ba4\u4ea4\u4ed8'],
    ]

    data = [header] + rows
    col_widths = [35, 85, 145, 200]
    t = Table(data, colWidths=col_widths, repeatRows=1)

    style_commands = [
        ('BACKGROUND', (0, 0), (-1, 0), MANDARIN),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, -1), CJK_FONT),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ('TEXTCOLOR', (0, 1), (-1, -1), HexColor('#333333')),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]

    style_commands.append(('BACKGROUND', (0, 5), (0, 5), HexColor('#FFF3E0')))
    style_commands.append(('BACKGROUND', (0, 6), (0, 6), HexColor('#F1F8E9')))

    t.setStyle(TableStyle(style_commands))
    return t


def make_shortcut_table():
    data = [
        ['\u64cd\u4f5c', '\u5982\u4f55\u6267\u884c'],  # 操作, 如何执行
        ['\u8054\u7cfb\u5ba2\u6237', '\u70b9\u51fb\u5217\u8868\u6216\u8be6\u60c5\u4e2d\u7684WhatsApp\u56fe\u6807'],
        ['\u66f4\u6539\u72b6\u6001', '\u6253\u5f00\u8ba2\u5355 > \u72b6\u6001\u4e0b\u62c9\u83dc\u5355 > \u66f4\u65b0'],
        ['\u4e0a\u4f20\u6587\u4ef6', '\u6253\u5f00\u8ba2\u5355 > \u6587\u4ef6\u90e8\u5206 > \u70b9\u51fb\u4e0a\u4f20'],
        ['\u6dfb\u52a0\u5907\u6ce8', '\u72b6\u6001\u66f4\u65b0\u8868\u5355\u4e2d\u7684\u201c\u5907\u6ce8\u201d\u5b57\u6bb5'],
        ['\u8bbe\u7f6e\u9884\u8ba1\u5230\u8fbe', '\u72b6\u6001\u66f4\u65b0\u8868\u5355\u4e2d\u7684\u65e5\u671f\u9009\u62e9\u5668'],
        ['\u641c\u7d22', '\u8ba2\u5355\u5217\u8868\u9876\u90e8\u7684\u641c\u7d22\u680f'],
        ['\u6309\u72b6\u6001\u7b5b\u9009', '\u641c\u7d22\u680f\u65c1\u8fb9\u7684\u7b5b\u9009\u4e0b\u62c9\u83dc\u5355'],
        ['\u67e5\u770b\u5386\u53f2', '\u8ba2\u5355\u8be6\u60c5\u4e2d\u7684\u201c\u6d3b\u52a8\u5386\u53f2\u201d\u90e8\u5206'],
        ['\u5237\u65b0', '\u53f3\u4e0a\u89d2\u7684\u201c\u5237\u65b0\u201d\u6309\u94ae'],
    ]

    t = Table(data, colWidths=[120, 345])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COD_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, -1), CJK_FONT),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, -1), 9.5),
        ('TEXTCOLOR', (0, 1), (0, -1), MANDARIN),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
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
    c.setFont(CJK_FONT, 28)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 + 25 * mm, '\u534f\u4f5c\u8005\u6307\u5357')  # 协作者指南

    c.setFillColor(HexColor('#FFCCAA'))
    c.setFont(CJK_FONT, 16)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 + 5 * mm, '\u8ba2\u5355\u7ba1\u7406')  # 订单管理
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 - 10 * mm, '\u4e0e\u4ea4\u4ed8\u8ddf\u8e2a')  # 与交付跟踪

    c.setStrokeColor(MANDARIN)
    c.setLineWidth(2)
    c.line(WIDTH / 2 - 40 * mm, HEIGHT / 2 - 25 * mm, WIDTH / 2 + 40 * mm, HEIGHT / 2 - 25 * mm)

    c.setFillColor(HexColor('#888888'))
    c.setFont(CJK_FONT, 11)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 - 40 * mm, '\u7248\u672c 2.0 - 2026\u5e742\u6708')  # 版本 2.0 - 2026年2月

    c.setFillColor(HexColor('#666666'))
    c.setFont(CJK_FONT, 9)
    c.drawCentredString(WIDTH / 2, 25 * mm, '\u5185\u90e8\u6587\u4ef6 - \u4ec5\u4f9b Driveby Africa \u534f\u4f5c\u8005\u4f7f\u7528')  # 内部文件 - 仅供 Driveby Africa 协作者使用

    c.setFillColor(MANDARIN)
    c.rect(0, 0, WIDTH, 4 * mm, fill=1, stroke=0)

    c.restoreState()


def header_footer(c, doc):
    c.saveState()

    c.setStrokeColor(MANDARIN)
    c.setLineWidth(1.5)
    c.line(2 * cm, HEIGHT - 1.5 * cm, WIDTH - 2 * cm, HEIGHT - 1.5 * cm)

    c.setFillColor(HexColor('#999999'))
    c.setFont(CJK_FONT, 8)
    c.drawString(2 * cm, HEIGHT - 1.3 * cm, 'Driveby Africa - \u534f\u4f5c\u8005\u6307\u5357')  # 协作者指南
    c.drawRightString(WIDTH - 2 * cm, HEIGHT - 1.3 * cm, 'v2.0')

    c.setStrokeColor(BORDER_COLOR)
    c.setLineWidth(0.5)
    c.line(2 * cm, 1.5 * cm, WIDTH - 2 * cm, 1.5 * cm)

    c.setFillColor(HexColor('#999999'))
    c.setFont(CJK_FONT, 8)
    c.drawString(2 * cm, 1 * cm, '\u673a\u5bc6\u6587\u4ef6')  # 机密文件
    c.drawRightString(WIDTH - 2 * cm, 1 * cm, f'\u7b2c {doc.page} \u9875')  # 第 X 页

    c.restoreState()


def build_guide():
    output_path = '/Users/user/Downloads/drivebyafrica-main/Guide-Collaborateur-Driveby-Africa-ZH.pdf'

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=2.2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
    )

    story = []

    # COVER PAGE
    story.append(Spacer(1, 1))
    story.append(PageBreak())

    # TABLE OF CONTENTS
    story.append(Paragraph('\u76ee\u5f55', styles['h1']))  # 目录
    story.append(Spacer(1, 8))

    toc_items = [
        ('1.', '\u767b\u5f55\u534f\u4f5c\u8005\u95e8\u6237'),  # 登录协作者门户
        ('2.', '\u4eea\u8868\u677f - \u6982\u89c8'),  # 仪表板 - 概览
        ('3.', '\u8ba2\u5355\u7ba1\u7406'),  # 订单管理
        ('4.', '14\u6b65\u5de5\u4f5c\u6d41\u7a0b'),  # 14步工作流程
        ('5.', '\u66f4\u65b0\u8ba2\u5355\u72b6\u6001'),  # 更新订单状态
        ('6.', '\u4e0a\u4f20\u6587\u4ef6'),  # 上传文件
        ('7.', '\u7279\u6b8a\u6b65\u9aa4\uff1a\u8d2d\u4e70\u548c\u63a5\u6536'),  # 特殊步骤：购买和接收
        ('8.', '\u901a\u8fc7WhatsApp\u8054\u7cfb\u5ba2\u6237'),  # 通过WhatsApp联系客户
        ('9.', '\u8f66\u8f86\u7ba1\u7406'),  # 车辆管理
        ('10.', '\u6279\u6b21\u7ba1\u7406'),  # 批次管理
        ('11.', '\u901a\u77e5\u548c\u5b9e\u65f6\u66f4\u65b0'),  # 通知和实时更新
        ('12.', '\u5feb\u901f\u53c2\u8003'),  # 快速参考
    ]

    for num, title in toc_items:
        data = [[
            Paragraph(f'<b>{num}</b>', ParagraphStyle('toc_num', parent=styles['toc_item'], textColor=MANDARIN)),
            Paragraph(title, styles['toc_item'])
        ]]
        t = Table(data, colWidths=[30, WIDTH - 4.5 * cm])
        t.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('LINEBELOW', (0, 0), (-1, -1), 0.3, HexColor('#EEEEEE')),
        ]))
        story.append(t)

    story.append(PageBreak())

    # SECTION 1: LOGIN
    story.append(Paragraph('1. \u767b\u5f55\u95e8\u6237', styles['h1']))  # 登录门户
    story.append(Paragraph(
        '\u534f\u4f5c\u8005\u95e8\u6237\u53ef\u901a\u8fc7 <b>/collaborator/login</b> \u8bbf\u95ee\u3002'
        '\u53ea\u6709\u62e5\u6709 <b>collaborator</b>\u3001<b>admin</b> \u6216 <b>super_admin</b> '
        '\u89d2\u8272\u7684\u7528\u6237\u624d\u80fd\u8bbf\u95ee\u3002',
        styles['body']
    ))
    story.append(Spacer(1, 6))

    story.append(make_numbered_step(1, '\u8bbf\u95ee\u767b\u5f55\u9875\u9762',  # 访问登录页面
        '\u8bbf\u95ee https://drivebyafrica.com/collaborator/login'))
    story.append(make_numbered_step(2, '\u8f93\u5165\u60a8\u7684\u51ed\u636e',  # 输入您的凭据
        '\u8f93\u5165\u7ba1\u7406\u5458\u63d0\u4f9b\u7684\u7535\u5b50\u90ae\u4ef6\u5730\u5740\u548c\u5bc6\u7801\u3002'))
    story.append(make_numbered_step(3, '\u9009\u62e9\u60a8\u7684\u8bed\u8a00',  # 选择您的语言
        '\u5728\u9875\u9762\u9876\u90e8\uff0c\u9009\u62e9\u60a8\u7684\u8bed\u8a00\uff1a\u82f1\u6587\u3001\u6cd5\u6587\u6216\u4e2d\u6587\u3002'))
    story.append(make_numbered_step(4, '\u8bbf\u95ee\u4eea\u8868\u677f',  # 访问仪表板
        '\u767b\u5f55\u540e\uff0c\u60a8\u5c06\u88ab\u91cd\u5b9a\u5411\u5230\u534f\u4f5c\u8005\u4eea\u8868\u677f\u3002'))

    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        '\u60a8\u7684\u4f1a\u8bdd\u5728\u60a8\u672a\u6ce8\u9500\u671f\u95f4\u4fdd\u6301\u6d3b\u52a8\u72b6\u6001\u3002'
        '\u4f7f\u7528\u4fa7\u8fb9\u680f\u4e2d\u7684\u201c\u6ce8\u9500\u201d\u6309\u94ae\u6b63\u786e\u9000\u51fa\u3002'
    ))

    story.append(PageBreak())

    # SECTION 2: DASHBOARD
    story.append(Paragraph('2. \u4eea\u8868\u677f', styles['h1']))  # 仪表板
    story.append(Paragraph(
        '\u4eea\u8868\u677f\u4e3a\u60a8\u63d0\u4f9b\u5f53\u524d\u6d3b\u52a8\u7684\u6982\u89c8\u3002'
        '\u5b83\u5b9e\u65f6\u66f4\u65b0\u3002',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('\u663e\u793a\u7684\u7edf\u8ba1\u6570\u636e', styles['h2']))  # 显示的统计数据

    stats_data = [
        ['\u6307\u6807', '\u63cf\u8ff0'],  # 指标, 描述
        ['\u4eca\u65e5\u65b0\u8ba2\u5355', '\u4eca\u5929\u6536\u5230\u7684\u8ba2\u5355\u6570\u91cf'],
        ['\u5df2\u5904\u7406\u8ba2\u5355', '\u4eca\u5929\u66f4\u65b0\u4e86\u72b6\u6001\u7684\u8ba2\u5355'],
        ['\u5df2\u5b8c\u6210\u8ba2\u5355', '\u4eca\u5929\u8fdb\u5165\u201c\u5df2\u4ea4\u4ed8\u201d\u72b6\u6001\u7684\u8ba2\u5355'],
        ['\u5f85\u5904\u7406\u64cd\u4f5c', '\u9700\u8981\u5e72\u9884\u7684\u8ba2\u5355\uff08\u65e9\u671f\u72b6\u6001\uff09'],
        ['\u8fdb\u884c\u4e2d', '\u4ece\u5b9a\u91d1\u5df2\u4ed8\u5230\u51fa\u53e3\u6d77\u5173\u7684\u8ba2\u5355'],
        ['\u8fd0\u8f93\u4e2d', '\u5728\u8fd0\u8f93\u6216\u5728\u6e2f\u53e3\u7684\u8ba2\u5355'],
        ['\u6d77\u8fd0\u4e2d', '\u6d77\u8fd0\u3001\u6587\u4ef6\u5c31\u7eea\u6216\u6d77\u5173\u6e05\u5173\u7684\u8ba2\u5355'],
        ['\u5df2\u5b8c\u6210', '\u53ef\u63d0\u8d27\u6216\u5df2\u4ea4\u4ed8\u7684\u8ba2\u5355'],
    ]

    t = Table(stats_data, colWidths=[140, 325])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COD_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, -1), CJK_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('TEXTCOLOR', (0, 1), (0, -1), MANDARIN),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t)

    story.append(Spacer(1, 12))
    story.append(Paragraph('\u6700\u8fd1\u8ba2\u5355', styles['h2']))  # 最近订单
    story.append(Paragraph(
        '\u663e\u793a\u6700\u8fd15\u4e2a\u6700\u8fd1\u66f4\u65b0\u7684\u8ba2\u5355\uff0c'
        '\u5305\u62ec\u5f53\u524d\u72b6\u6001\u3001\u76f8\u5173\u8f66\u8f86\u548c\u4e0a\u6b21\u4fee\u6539\u4ee5\u6765\u7684\u65f6\u95f4\u3002'
        '\u70b9\u51fb\u8ba2\u5355\u53ef\u76f4\u63a5\u8fdb\u5165\u5176\u8be6\u60c5\u9875\u9762\u3002',
        styles['body']
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph('\u901a\u77e5', styles['h2']))  # 通知
    story.append(Paragraph(
        '\u901a\u77e5\u9762\u677f\u663e\u793a\u6700\u8fd110\u4e2a\u4e8b\u4ef6\u3002'
        '\u672a\u8bfb\u901a\u77e5\u4f1a\u7a81\u51fa\u663e\u793a\u3002\u70b9\u51fb\u901a\u77e5\u53ef\u5c06\u5176\u6807\u8bb0\u4e3a\u5df2\u8bfb'
        '\u5e76\u5bfc\u822a\u5230\u76f8\u5173\u8ba2\u5355\u3002',
        styles['body']
    ))

    story.append(PageBreak())

    # SECTION 3: ORDER MANAGEMENT
    story.append(Paragraph('3. \u8ba2\u5355\u7ba1\u7406', styles['h1']))  # 订单管理
    story.append(Paragraph(
        '\u8ba2\u5355\u9875\u9762\u662f\u60a8\u65e5\u5e38\u5de5\u4f5c\u7684\u6838\u5fc3\u3002'
        '\u5b83\u5141\u8bb8\u60a8\u8ddf\u8e2a\u3001\u66f4\u65b0\u548c\u7ba1\u7406\u6240\u6709\u8ba2\u5355\u3002',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('\u8ba2\u5355\u5217\u8868', styles['h2']))  # 订单列表
    story.append(Paragraph(
        '\u5217\u8868\u663e\u793a\u6240\u6709\u8ba2\u5355\uff0c\u5305\u542b\u4ee5\u4e0b\u4fe1\u606f\uff1a',
        styles['body']
    ))

    list_items = [
        '<b>\u8ba2\u5355\u7f16\u53f7</b>\u548c\u6700\u540e\u66f4\u65b0\u65e5\u671f',
        '<b>\u8f66\u8f86</b>\uff1a\u7167\u7247\u3001\u54c1\u724c\u3001\u578b\u53f7\u3001\u5e74\u4efd\u548c\u4ef7\u683c',
        '<b>\u5ba2\u6237</b>\uff1a\u59d3\u540d\u548cWhatsApp\u8054\u7cfb\u6309\u94ae',
        '<b>\u76ee\u7684\u5730</b>\uff1a\u56fd\u65d7\u548c\u76ee\u7684\u5730\u540d\u79f0',
        '<b>\u8fdb\u5ea6</b>\uff1a\u8fdb\u5ea6\u6761\u548c\u5f53\u524d\u72b6\u6001',
        '<b>\u9884\u8ba1\u5230\u8fbe</b>\uff1a\u9884\u8ba1\u5230\u8fbe\u65e5\u671f',
    ]
    for item in list_items:
        story.append(Paragraph(f'\u2022 {item}', ParagraphStyle('list', parent=styles['body'], leftIndent=15)))

    story.append(Spacer(1, 10))
    story.append(Paragraph('\u641c\u7d22\u548c\u7b5b\u9009', styles['h2']))  # 搜索和筛选
    story.append(Paragraph(
        '\u4f7f\u7528<b>\u641c\u7d22\u680f</b>\u6309\u7f16\u53f7\u3001\u8f66\u8f86\u54c1\u724c\u6216\u578b\u53f7\u67e5\u627e\u8ba2\u5355\u3002'
        '<b>\u72b6\u6001\u7b5b\u9009</b>\u5141\u8bb8\u60a8\u4ec5\u663e\u793a\u7279\u5b9a\u9636\u6bb5\u7684\u8ba2\u5355\u3002',
        styles['body']
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph('\u8ba2\u5355\u8be6\u60c5', styles['h2']))  # 订单详情
    story.append(Paragraph(
        '\u70b9\u51fb\u8ba2\u5355\u6253\u5f00\u5176\u8be6\u60c5\u9875\u9762\u3002\u60a8\u5c06\u627e\u5230\uff1a',
        styles['body']
    ))

    detail_items = [
        '<b>\u53ef\u89c6\u5316\u65f6\u95f4\u7ebf</b>\uff1a14\u6b65\u8fdb\u5ea6\u663e\u793a',
        '<b>\u72b6\u6001\u66f4\u65b0\u8868\u5355</b>\uff1a\u5305\u542b\u5907\u6ce8\u548c\u9884\u8ba1\u5230\u8fbe\u5b57\u6bb5',
        '<b>\u6587\u4ef6\u90e8\u5206</b>\uff1a\u7528\u4e8e\u4e0a\u4f20\u6240\u9700\u6587\u4ef6',
        '<b>\u6d3b\u52a8\u5386\u53f2</b>\uff1a\u663e\u793a\u8c01\u5728\u4f55\u65f6\u505a\u4e86\u4ec0\u4e48\u4fee\u6539',
        '<b>\u8fd0\u8f93\u5408\u4f5c\u4f19\u4f34</b>\uff1a\u5df2\u5206\u914d\u7684\u5408\u4f5c\u4f19\u4f34\uff08\u5982\u9002\u7528\uff09',
        '<b>\u5ba2\u6237\u4fe1\u606f</b>\u548c\u76ee\u7684\u5730',
    ]
    for item in detail_items:
        story.append(Paragraph(f'\u2022 {item}', ParagraphStyle('list', parent=styles['body'], leftIndent=15)))

    story.append(PageBreak())

    # SECTION 4: 14-STEP WORKFLOW
    story.append(Paragraph('4. 14\u6b65\u5de5\u4f5c\u6d41\u7a0b', styles['h1']))  # 14步工作流程
    story.append(Paragraph(
        '\u6bcf\u4e2a\u8ba2\u5355\u9075\u5faa14\u6b65\u6d41\u7a0b\uff0c\u4ece\u6536\u5230\u5b9a\u91d1'
        '\u5230\u6700\u7ec8\u4ea4\u4ed8\u3002\u67d0\u4e9b\u6b65\u9aa4\u9700\u8981\u7279\u5b9a\u7684\u6587\u4ef6\u6216\u64cd\u4f5c\u3002',
        styles['body']
    ))
    story.append(Spacer(1, 10))

    story.append(make_status_table())

    story.append(Spacer(1, 10))
    story.append(make_tip_box(
        '\u6807\u8bb0\u4e3a\u201c(\u5185\u90e8)\u201d\u7684\u6587\u4ef6<b>\u5ba2\u6237\u4e0d\u53ef\u89c1</b>\u3002'
        '\u5b83\u4eec\u4ec5\u4f9b\u7ba1\u7406\u5458\u548c\u534f\u4f5c\u8005\u56e2\u961f\u5185\u90e8\u8ddf\u8e2a\u4f7f\u7528\u3002',
    ))

    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        '\u7b2c6\u6b65\u201c\u8f66\u8f86\u5df2\u63a5\u6536\u201d\u5728\u5ba2\u6237\u7684\u8ddf\u8e2a\u89c6\u56fe\u4e2d<b>\u4e0d\u53ef\u89c1</b>\u3002'
        '\u8fd9\u662f\u4e00\u4e2a\u5185\u90e8\u6b65\u9aa4\uff0c\u7528\u4e8e\u5411\u8ba2\u5355\u5206\u914d\u8fd0\u8f93\u5408\u4f5c\u4f19\u4f34\u3002',
        'warn'
    ))

    story.append(PageBreak())

    # SECTION 5: UPDATE STATUS
    story.append(Paragraph('5. \u66f4\u65b0\u8ba2\u5355\u72b6\u6001', styles['h1']))  # 更新订单状态
    story.append(Paragraph(
        '\u8981\u5728\u5de5\u4f5c\u6d41\u7a0b\u4e2d\u63a8\u8fdb\u8ba2\u5355\uff0c\u60a8\u9700\u8981\u66f4\u65b0\u5176\u72b6\u6001\u3002'
        '\u4ee5\u4e0b\u662f\u5206\u6b65\u64cd\u4f5c\u6b65\u9aa4\uff1a',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(make_numbered_step(1, '\u6253\u5f00\u8ba2\u5355',  # 打开订单
        '\u4ece\u5217\u8868\u4e2d\uff0c\u70b9\u51fb\u201cView\u201d\u6309\u94ae\u6216\u70b9\u51fb\u8ba2\u5355\u884c\u3002'))
    story.append(make_numbered_step(2, '\u9009\u62e9\u65b0\u72b6\u6001',  # 选择新状态
        '\u5728\u201c\u66f4\u65b0\u72b6\u6001\u201d\u4e0b\u62c9\u83dc\u5355\u4e2d\uff0c\u9009\u62e9\u5de5\u4f5c\u6d41\u7a0b\u7684\u4e0b\u4e00\u6b65\u3002'))
    story.append(make_numbered_step(3, '\u6dfb\u52a0\u5907\u6ce8\uff08\u5efa\u8bae\uff09',  # 添加备注（建议）
        '\u5728\u6587\u672c\u5b57\u6bb5\u4e2d\u8f93\u5165\u89e3\u91ca\u6027\u5907\u6ce8\u3002\u5b83\u5c06\u663e\u793a\u5728\u6d3b\u52a8\u5386\u53f2\u4e2d\u3002'))
    story.append(make_numbered_step(4, '\u5982\u9700\u8981\uff0c\u8bbe\u7f6e\u9884\u8ba1\u5230\u8fbe\u65e5\u671f',  # 如需要，设置预计到达日期
        '\u4f7f\u7528\u65e5\u671f\u9009\u62e9\u5668\u6307\u5b9a\u9884\u8ba1\u5230\u8fbe\u65e5\u671f\u3002'))
    story.append(make_numbered_step(5, '\u70b9\u51fb\u201c\u66f4\u65b0\u201d',  # 点击"更新"
        '\u72b6\u6001\u7acb\u5373\u66f4\u65b0\u3002\u7cfb\u7edf\u4f1a\u5411\u5ba2\u6237\u53d1\u9001\u901a\u77e5'
        '\uff08\u5185\u90e8\u6b65\u9aa4\u9664\u5916\uff09\u3002'))

    story.append(Spacer(1, 10))
    story.append(make_tip_box(
        '\u5982\u679c\u60a8\u672a\u66f4\u6539\u72b6\u6001\uff0c\u201c\u66f4\u65b0\u201d\u6309\u94ae\u5c06\u88ab\u7981\u7528\u3002'
        '\u60a8\u5fc5\u987b\u9009\u62e9\u4e0e\u5f53\u524d\u72b6\u6001\u4e0d\u540c\u7684\u72b6\u6001\u3002',
        'info'
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph('\u81ea\u52a8\u901a\u77e5', styles['h2']))  # 自动通知
    story.append(Paragraph(
        '\u5f53\u60a8\u66f4\u65b0\u8ba2\u5355\u72b6\u6001\u65f6\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u5411\u5ba2\u6237\u53d1\u9001WhatsApp\u901a\u77e5'
        '\uff08\u5bf9\u4e8e\u53ef\u89c1\u6b65\u9aa4\uff09\u3002<b>\u4f8b\u5916</b>\uff1a\u201c\u8f66\u8f86\u5df2\u63a5\u6536\u201d\u6b65\u9aa4\uff08\u7b2c6\u6b65\uff09'
        '<b>\u4e0d\u4f1a\u89e6\u53d1\u4efb\u4f55\u901a\u77e5</b>\uff0c\u56e0\u4e3a\u5b83\u662f\u7eaf\u7cb9\u7684\u5185\u90e8\u6b65\u9aa4\u3002',
        styles['body']
    ))

    story.append(PageBreak())

    # SECTION 6: DOCUMENTS
    story.append(Paragraph('6. \u4e0a\u4f20\u6587\u4ef6', styles['h1']))  # 上传文件
    story.append(Paragraph(
        '\u6bcf\u4e2a\u5de5\u4f5c\u6d41\u7a0b\u6b65\u9aa4\u53ef\u80fd\u9700\u8981\u7279\u5b9a\u7684\u6587\u4ef6\uff08\u7167\u7247\u3001PDF\u3001\u94fe\u63a5\uff09\u3002'
        '\u8ba2\u5355\u8be6\u60c5\u4e2d\u7684\u201c\u6587\u4ef6\u201d\u90e8\u5206\u4f1a\u663e\u793a\u9700\u8981\u4ec0\u4e48\u3002',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('\u6587\u4ef6\u7c7b\u578b', styles['h2']))  # 文件类型

    doc_types = [
        ['\u7c7b\u578b', '\u63a5\u53d7\u7684\u683c\u5f0f', '\u793a\u4f8b'],  # 类型, 接受的格式, 示例
        ['\u56fe\u7247', 'JPG, PNG', '\u8f66\u8f86\u7167\u7247\u3001\u96c6\u88c5\u7bb1\u5c01\u6761'],
        ['\u6587\u4ef6', 'PDF, DOC, DOCX', '\u53d1\u7968\u3001\u62a5\u544a\u3001\u63d0\u5355'],
        ['URL\u94fe\u63a5', '\u5b8c\u6574URL', '\u96c6\u88c5\u7bb1\u8ddf\u8e2a\u94fe\u63a5'],
    ]

    t = Table(doc_types, colWidths=[90, 140, 235])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), MANDARIN),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, -1), CJK_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t)

    story.append(Spacer(1, 12))
    story.append(Paragraph('\u4e0a\u4f20\u6d41\u7a0b', styles['h2']))  # 上传流程
    story.append(make_numbered_step(1, '\u6253\u5f00\u6587\u4ef6\u90e8\u5206',  # 打开文件部分
        '\u5728\u8ba2\u5355\u8be6\u60c5\u4e2d\uff0c\u627e\u5230\u72b6\u6001\u8868\u5355\u4e0b\u65b9\u7684\u201c\u6587\u4ef6\u201d\u90e8\u5206\u3002'))
    story.append(make_numbered_step(2, '\u8bc6\u522b\u6240\u9700\u6587\u4ef6',  # 识别所需文件
        '\u6bcf\u79cd\u9884\u671f\u7684\u6587\u4ef6\u7c7b\u578b\u90fd\u5217\u6709\u5176\u540d\u79f0\u548c\u63cf\u8ff0\u3002'))
    story.append(make_numbered_step(3, '\u70b9\u51fb\u4e0a\u4f20',  # 点击上传
        '\u4ece\u60a8\u7684\u7535\u8111\u4e2d\u9009\u62e9\u6587\u4ef6\u3002\u8fdb\u5ea6\u5b9e\u65f6\u663e\u793a\u3002'))
    story.append(make_numbered_step(4, '\u9a8c\u8bc1\u4e0a\u4f20',  # 验证上传
        '\u6587\u4ef6\u51fa\u73b0\u5728\u5217\u8868\u4e2d\uff0c\u5e26\u6709\u4e0b\u8f7d\u94fe\u63a5\u3002'))

    story.append(Spacer(1, 10))
    story.append(Paragraph('\u6587\u4ef6\u53ef\u89c1\u6027', styles['h2']))  # 文件可见性
    story.append(Paragraph(
        '\u6bcf\u4e2a\u6587\u4ef6\u90fd\u6709\u53ef\u89c1\u6027\u6307\u793a\u5668\uff1a',
        styles['body']
    ))
    story.append(Paragraph(
        '\u2022 <b>\u5ba2\u6237\u53ef\u89c1</b>\uff1a\u5ba2\u6237\u53ef\u4ee5\u4ece\u5176\u4eea\u8868\u677f\u4e0b\u8f7d\u6b64\u6587\u4ef6',
        ParagraphStyle('list', parent=styles['body'], leftIndent=15)
    ))
    story.append(Paragraph(
        '\u2022 <b>\u4ec5\u7ba1\u7406\u5458</b>\uff1a\u4ec5\u4f9b\u5185\u90e8\u56e2\u961f\u4f7f\u7528\uff0c\u5ba2\u6237\u4e0d\u53ef\u89c1',
        ParagraphStyle('list', parent=styles['body'], leftIndent=15)
    ))
    story.append(Paragraph(
        '\u2022 <b>\u81ea\u52a8</b>\uff1a\u7cfb\u7edf\u81ea\u52a8\u751f\u6210\uff08\u4f8b\u5982\uff1aDriveby\u53d1\u7968\uff09',
        ParagraphStyle('list', parent=styles['body'], leftIndent=15)
    ))

    story.append(PageBreak())

    # SECTION 7: SPECIAL STEPS
    story.append(Paragraph('7. \u7279\u6b8a\u6b65\u9aa4', styles['h1']))  # 特殊步骤

    story.append(Paragraph('\u7b2c5\u6b65\uff1a\u8f66\u8f86\u5df2\u8d2d\u4e70', styles['h2']))  # 第5步：车辆已购买
    story.append(Paragraph(
        '\u5f53\u60a8\u5c06\u8ba2\u5355\u79fb\u81f3<b>\u201c\u8f66\u8f86\u5df2\u8d2d\u4e70\u201d</b>\u72b6\u6001\u65f6\uff0c'
        '\u4f1a\u51fa\u73b0\u4e00\u4e2a\u989d\u5916\u5b57\u6bb5\u8f93\u5165<b>\u5b9e\u9645\u8d2d\u4e70\u4ef7\u683c</b>\uff08\u7f8e\u5143\uff09\u3002',
        styles['body']
    ))
    story.append(Spacer(1, 6))

    purchase_data = [
        [Paragraph(
            '<b>\u5b9e\u9645\u8d2d\u4e70\u4ef7\u683c (USD)</b><br/>'
            '\u6b64\u5b57\u6bb5\u4e3a<b>\u5fc5\u586b</b>\u3002\u5b83\u7528\u4e8e\u8ba1\u7b97\u8ba2\u5355\u7684\u5b9e\u9645\u5229\u6da6\u3002<br/>'
            '\u6b64\u4fe1\u606f\u4e25\u683c\u4fdd\u5bc6\uff0c\u4ec5\u7ba1\u7406\u5458\u548c\u534f\u4f5c\u8005\u53ef\u89c1\u3002',
            ParagraphStyle('box_text', parent=styles['body'], fontSize=10)
        )]
    ]
    t = Table(purchase_data, colWidths=[WIDTH - 4 * cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#FFF8E1')),
        ('BOX', (0, 0), (-1, -1), 1, HexColor('#FFB300')),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t)

    story.append(Spacer(1, 16))

    story.append(Paragraph('\u7b2c6\u6b65\uff1a\u8f66\u8f86\u5df2\u63a5\u6536', styles['h2']))  # 第6步：车辆已接收
    story.append(Paragraph(
        '<b>\u201c\u8f66\u8f86\u5df2\u63a5\u6536\u201d</b>\u6b65\u9aa4\u662f\u5185\u90e8\u6b65\u9aa4\uff0c\u5ba2\u6237\u4e0d\u53ef\u89c1\u3002'
        '\u5b83\u5141\u8bb8\u5411\u8ba2\u5355\u5206\u914d<b>\u8fd0\u8f93\u5408\u4f5c\u4f19\u4f34</b>\uff08\u8d27\u8fd0\u4ee3\u7406\uff09\u3002',
        styles['body']
    ))
    story.append(Spacer(1, 6))

    story.append(make_numbered_step(1, '\u9009\u62e9\u201c\u8f66\u8f86\u5df2\u63a5\u6536\u201d\u72b6\u6001',  # 选择"车辆已接收"状态
        '\u8fd0\u8f93\u5408\u4f5c\u4f19\u4f34\u4e0b\u62c9\u83dc\u5355\u4f1a\u81ea\u52a8\u51fa\u73b0\u3002'))
    story.append(make_numbered_step(2, '\u9009\u62e9\u8d27\u8fd0\u4ee3\u7406',  # 选择货运代理
        '\u5408\u4f5c\u4f19\u4f34\u6309\u76ee\u7684\u5730\u56fd\u5bb6\u5206\u7ec4\u3002\u8986\u76d6\u8ba2\u5355\u76ee\u7684\u5730\u56fd\u5bb6\u7684\u5408\u4f5c\u4f19\u4f34'
        '\u4f1a\u4f18\u5148\u663e\u793a\u3002'))
    story.append(make_numbered_step(3, '\u786e\u8ba4\u66f4\u65b0',  # 确认更新
        '\u8d27\u8fd0\u4ee3\u7406\u4fe1\u606f\u5c06\u88ab\u4fdd\u5b58\u5e76\u663e\u793a\u5728\u8ba2\u5355\u8be6\u60c5\u4e2d\u3002'))

    story.append(Spacer(1, 10))
    story.append(make_tip_box(
        '\u5982\u679c\u6ca1\u6709\u5408\u4f5c\u4f19\u4f34\u8986\u76d6\u76ee\u7684\u5730\u56fd\u5bb6\uff0c\u4f1a\u663e\u793a\u8b66\u544a\u6d88\u606f\u3002'
        '\u60a8\u4ecd\u53ef\u4ee5\u4ece\u201c\u5176\u4ed6\u5408\u4f5c\u4f19\u4f34\u201d\u5217\u8868\u4e2d\u9009\u62e9\u3002',
        'warn'
    ))

    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        '\u8d27\u8fd0\u4ee3\u7406\u5206\u914d\u8bb0\u5f55\u5728\u6d3b\u52a8\u5386\u53f2\u4e2d\uff0c\u5305\u62ec\u5408\u4f5c\u4f19\u4f34\u540d\u79f0'
        '\u548c\u5206\u914d\u65e5\u671f\u3002\u6b64\u6b65\u9aa4\u4e0d\u4f1a\u53d1\u9001WhatsApp\u901a\u77e5\u3002'
    ))

    story.append(PageBreak())

    # SECTION 8: WHATSAPP
    story.append(Paragraph('8. \u8054\u7cfb\u5ba2\u6237', styles['h1']))  # 联系客户
    story.append(Paragraph(
        '\u60a8\u53ef\u4ee5\u76f4\u63a5\u4ece\u5e94\u7528\u7a0b\u5e8f\u901a\u8fc7WhatsApp\u8054\u7cfb\u5ba2\u6237\u3002'
        '\u6d88\u606f\u5c06\u9884\u586b\u5ba2\u6237\u59d3\u540d\u548c\u8ba2\u5355\u7f16\u53f7\u3002',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('\u4ece\u8ba2\u5355\u5217\u8868', styles['h3']))  # 从订单列表
    story.append(Paragraph(
        '\u70b9\u51fb\u201c\u5ba2\u6237\u201d\u5217\u4e2d\u5ba2\u6237\u540d\u79f0\u65c1\u8fb9\u7684WhatsApp\u56fe\u6807\uff08\u7eff\u8272\uff09\u3002',
        styles['body']
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph('\u4ece\u8ba2\u5355\u8be6\u60c5', styles['h3']))  # 从订单详情
    story.append(Paragraph(
        '\u8be6\u60c5\u9875\u9762\u5e95\u90e8\u7684\u201c\u5ba2\u6237\u201d\u90e8\u5206\u6709\u4e00\u4e2a\u201c\u8054\u7cfb\u201d\u6309\u94ae\u3002',
        styles['body']
    ))

    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        'WhatsApp\u53f7\u7801\u4f1a\u81ea\u52a8\u683c\u5f0f\u5316\u3002\u5982\u679c\u5ba2\u6237\u6ca1\u6709\u6ce8\u518cWhatsApp\u53f7\u7801\uff0c'
        '\u6309\u94ae\u5c06\u4e0d\u4f1a\u663e\u793a\u3002',
        'info'
    ))

    story.append(Spacer(1, 16))

    # SECTION 9: VEHICLES
    story.append(Paragraph('9. \u8f66\u8f86\u7ba1\u7406', styles['h1']))  # 车辆管理
    story.append(Paragraph(
        '\u201c\u8f66\u8f86\u201d\u90e8\u5206\u5141\u8bb8\u60a8\u7ba1\u7406\u60a8\u63d0\u4f9b\u7684\u8f66\u8f86\u3002'
        '\u60a8\u53ef\u4ee5\u6dfb\u52a0\u3001\u7f16\u8f91\u548c\u5220\u9664\u8f66\u8f86\u3002',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('\u6dfb\u52a0\u8f66\u8f86', styles['h2']))  # 添加车辆
    story.append(Paragraph(
        '\u586b\u5199\u8f66\u8f86\u4fe1\u606f\u8868\u5355\uff1a\u54c1\u724c\u3001\u578b\u53f7\u3001\u5e74\u4efd\u3001\u4ef7\u683c\u3001'
        '\u91cc\u7a0b\u3001\u71c3\u6599\u7c7b\u578b\u3001\u53d8\u901f\u7bb1\u548c\u7167\u7247\u3002\u8f66\u8f86\u5c06\u63d0\u4ea4\u7ed9'
        '\u7ba1\u7406\u5458\u5ba1\u6279\u3002',
        styles['body']
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph('\u8f66\u8f86\u72b6\u6001', styles['h2']))  # 车辆状态

    veh_status = [
        ['\u72b6\u6001', '\u542b\u4e49'],  # 状态, 含义
        ['\u5f85\u5ba1\u6838', '\u7b49\u5f85\u7ba1\u7406\u5458\u5ba1\u6279'],
        ['\u5df2\u6279\u51c6', '\u5df2\u6279\u51c6\u5e76\u5728\u7f51\u7ad9\u4e0a\u53ef\u89c1'],
        ['\u5df2\u62d2\u7edd', '\u88ab\u7ba1\u7406\u5458\u62d2\u7edd\uff08\u663e\u793a\u539f\u56e0\uff09'],
    ]
    t = Table(veh_status, colWidths=[100, 365])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COD_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, -1), CJK_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t)

    story.append(PageBreak())

    # SECTION 10: BATCHES
    story.append(Paragraph('10. \u6279\u6b21\u7ba1\u7406', styles['h1']))  # 批次管理
    story.append(Paragraph(
        '\u201c\u6279\u6b21\u201d\u90e8\u5206\u5141\u8bb8\u60a8\u7ba1\u7406\u76f8\u540c\u8f66\u8f86\u7684\u6279\u6b21'
        '\uff08\u76f8\u540c\u54c1\u724c\u3001\u578b\u53f7\u3001\u5e74\u4efd\uff09\u7528\u4e8e\u6279\u53d1\u3002',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        '\u60a8\u53ef\u4ee5\u901a\u8fc7\u6307\u5b9a\u53ef\u7528\u6570\u91cf\u3001\u5355\u4ef7\u548c\u8f66\u8f86\u8be6\u60c5\u6765\u521b\u5efa\u6279\u6b21\u3002'
        '\u6279\u6b21\u72b6\u6001\u9075\u5faa\u4e0e\u5355\u4e2a\u8f66\u8f86\u76f8\u540c\u7684\u5de5\u4f5c\u6d41\u7a0b'
        '\uff08\u5f85\u5ba1\u6838\u3001\u5df2\u6279\u51c6\u3001\u5df2\u62d2\u7edd\uff09\u3002',
        styles['body']
    ))

    story.append(Spacer(1, 16))

    # SECTION 11: NOTIFICATIONS
    story.append(Paragraph('11. \u901a\u77e5\u548c\u5b9e\u65f6\u66f4\u65b0', styles['h1']))  # 通知和实时更新
    story.append(Paragraph(
        '\u5e94\u7528\u7a0b\u5e8f\u4ee5<b>\u5b9e\u65f6</b>\u65b9\u5f0f\u8fd0\u884c\u3002\u5f53\u53e6\u4e00\u4e2a\u534f\u4f5c\u8005\u6216'
        '\u7ba1\u7406\u5458\u66f4\u65b0\u8ba2\u5355\u65f6\uff0c\u60a8\u7684\u5c4f\u5e55\u4f1a\u81ea\u52a8\u5237\u65b0\u3002',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('\u901a\u77e5\u94c3\u58f0', styles['h2']))  # 通知铃声
    story.append(Paragraph(
        '\u53f3\u4e0a\u89d2\u7684\u94c3\u94db\u663e\u793a\u672a\u8bfb\u901a\u77e5\u6570\u91cf\u3002'
        '\u70b9\u51fb\u6253\u5f00\u9762\u677f\uff1a',
        styles['body']
    ))

    notif_items = [
        '\u672a\u8bfb\u901a\u77e5\u6709\u84dd\u8272\u80cc\u666f',
        '\u70b9\u51fb\u901a\u77e5\u53ef\u5c06\u5176\u6807\u8bb0\u4e3a\u5df2\u8bfb',
        '\u70b9\u51fb\u201c\u5168\u90e8\u6807\u8bb0\u4e3a\u5df2\u8bfb\u201d\u4e00\u6b21\u6027\u6e05\u9664',
        '\u6bcf\u4e2a\u901a\u77e5\u53ef\u80fd\u5305\u542b\u6307\u5411\u76f8\u5173\u8ba2\u5355\u7684\u94fe\u63a5',
    ]
    for item in notif_items:
        story.append(Paragraph(f'\u2022 {item}', ParagraphStyle('list', parent=styles['body'], leftIndent=15)))

    story.append(Spacer(1, 10))
    story.append(Paragraph('\u534f\u4f5c\u8005\u5fbd\u7ae0', styles['h2']))  # 协作者徽章
    story.append(Paragraph(
        '\u6bcf\u6b21\u4fee\u6539\u90fd\u7531\u5206\u914d\u7ed9\u6bcf\u4e2a\u534f\u4f5c\u8005\u7684\u552f\u4e00\u989c\u8272\u5fbd\u7ae0\u6807\u8bc6\u3002'
        '\u8fd9\u8ba9\u60a8\u53ef\u4ee5\u770b\u5230\u8c01\u5bf9\u8ba2\u5355\u8fdb\u884c\u4e86\u6700\u540e\u7684\u66f4\u65b0\u3002',
        styles['body']
    ))

    story.append(PageBreak())

    # SECTION 12: QUICK REFERENCE
    story.append(Paragraph('12. \u5feb\u901f\u53c2\u8003', styles['h1']))  # 快速参考
    story.append(Spacer(1, 8))

    story.append(make_shortcut_table())

    story.append(Spacer(1, 16))

    story.append(Paragraph('\u5efa\u8bae\u7684\u6bcf\u65e5\u5e38\u89c4', styles['h2']))  # 建议的每日常规
    story.append(Spacer(1, 6))

    story.append(make_numbered_step(1, '\u67e5\u770b\u4eea\u8868\u677f',  # 查看仪表板
        '\u67e5\u770b\u6bcf\u65e5\u7edf\u8ba1\u6570\u636e\u548c\u5f85\u5904\u7406\u7684\u8ba2\u5355\u3002'))
    story.append(make_numbered_step(2, '\u5904\u7406\u4f18\u5148\u8ba2\u5355',  # 处理优先订单
        '\u4ece\u65e9\u671f\u9636\u6bb5\u7684\u8ba2\u5355\u5f00\u59cb\uff08\u5b9a\u91d1\u5df2\u4ed8\u3001\u8f66\u8f86\u5df2\u9501\u5b9a\uff09\u3002'))
    story.append(make_numbered_step(3, '\u4e0a\u4f20\u7f3a\u5c11\u7684\u6587\u4ef6',  # 上传缺少的文件
        '\u9a8c\u8bc1\u6bcf\u4e2a\u6b65\u9aa4\u6240\u9700\u7684\u6240\u6709\u6587\u4ef6\u90fd\u5df2\u4e0a\u4f20\u3002'))
    story.append(make_numbered_step(4, '\u66f4\u65b0\u72b6\u6001',  # 更新状态
        '\u5f53\u6761\u4ef6\u6ee1\u8db3\u65f6\uff0c\u63a8\u8fdb\u8ba2\u5355\u3002'))
    story.append(make_numbered_step(5, '\u5982\u9700\u8981\uff0c\u8054\u7cfb\u5ba2\u6237',  # 如需要，联系客户
        '\u4f7f\u7528WhatsApp\u56de\u7b54\u95ee\u9898\u6216\u901a\u77e5\u53d8\u66f4\u3002'))
    story.append(make_numbered_step(6, '\u68c0\u67e5\u901a\u77e5',  # 检查通知
        '\u786e\u4fdd\u6ca1\u6709\u9519\u8fc7\u91cd\u8981\u7684\u901a\u77e5\u3002'))

    story.append(Spacer(1, 16))

    final_data = [[Paragraph(
        '<b>\u9700\u8981\u5e2e\u52a9\uff1f</b><br/><br/>'
        '\u5982\u6709\u4efb\u4f55\u6280\u672f\u95ee\u9898\u6216\u8bbf\u95ee\u8bf7\u6c42\uff0c\u8bf7\u8054\u7cfbDriveby Africa\u7ba1\u7406\u5458\u3002'
        '\u5bf9\u4e8e\u7d27\u6025\u95ee\u9898\uff0c\u8bf7\u4f7f\u7528\u5185\u90e8\u6c9f\u901a\u6e20\u9053\u3002',
        ParagraphStyle('final', parent=styles['body'], alignment=TA_CENTER, fontSize=11)
    )]]
    t = Table(final_data, colWidths=[WIDTH - 4 * cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SECTION_BG),
        ('BOX', (0, 0), (-1, -1), 1.5, MANDARIN),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('RIGHTPADDING', (0, 0), (-1, -1), 20),
        ('TOPPADDING', (0, 0), (-1, -1), 16),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    story.append(t)

    doc.build(story, onFirstPage=draw_cover, onLaterPages=header_footer)
    print(f'PDF generated: {output_path}')


if __name__ == '__main__':
    build_guide()
